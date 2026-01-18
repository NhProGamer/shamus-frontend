<script setup lang="ts">
import { ref, computed, nextTick, onMounted, inject, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWebSocket, type WebSocketMessage, type WebSocketStatus } from "@/composables/useWebSocket"
import { useOidcStore } from "vue3-oidc"
import { type MainTab, type ChatChannel, type ChatMessage, type GameState } from "@/types/gameTypes"
import ErrorDisplay from "@/components/ErrorDisplay.vue"

// --- CONSTANTES ---
const MAX_MSG_LENGTH = 500
const RECONNECT_DELAY = 5000
const STATUS_LABELS: Record<WebSocketStatus, string> = {
  'connecting': 'Connexion...',
  'open': 'Connecté',
  'closing': 'Déconnexion...',
  'closed': 'Déconnecté',
  'error': 'Erreur'
}

// --- INJECTIONS & STORE ---
const { state: oidcState } = useOidcStore()
const route = useRoute()
const showLoading = inject<() => void>('showLoading', () => {})
const hideLoading = inject<() => void>('hideLoading', () => {})

// --- CONFIGURATION WEBSOCKET ---
const gameID = route.query.gameID as string
const wsUrl = computed(() => {
  if (!gameID || !oidcState.value.user?.id_token) return ''
  // Utilisation d'une variable d'env pour l'URL (Best Practice Infra)
  const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
  return `${baseUrl}/app/ws/${gameID}?access_token=${oidcState.value.user.id_token}`
})

const {
  status: connectionStatus,
  messages: wsMessages,
  error: wsError,
  connect,
  sendMsg,
  close,
  reconnect
} = useWebSocket(wsUrl.value, {
  autoReconnect: true,
  reconnectDelay: RECONNECT_DELAY,
  maxReconnectAttempts: 10
})

// --- STATE: UI & OPTIONS ---
const currentMainTab = ref<MainTab>('chat')
const streamerMode = ref(false)

// --- STATE: JEU & JOUEURS ---
const gameState = ref<GameState>({
  currentPhase: 'night',
  nightNumber: 1,
  players: []
})

const livingPlayers = computed(() => gameState.value.players.filter(p => p.isAlive))
const deadPlayers = computed(() => gameState.value.players.filter(p => !p.isAlive))
const currentPhaseText = computed(() =>
    gameState.value.currentPhase === 'day'
        ? `JOUR ${gameState.value.nightNumber}`
        : `NUIT ${gameState.value.nightNumber}`
)

// --- STATE: CHAT ---
const currentChatChannel = ref<ChatChannel>('village')
const newMessage = ref('')
const messages = ref<ChatMessage[]>([])
const scrollContainer = ref<HTMLDivElement | null>(null)

const filteredMessages = computed(() =>
    messages.value.filter(m => m.channel === currentChatChannel.value)
)

// --- LOGIQUE MÉTIER ---

/** Gestion centralisée des messages entrants */
const handleIncomingMessage = (message: WebSocketMessage) => {
  if (!message?.type) return

  switch (message.type) {
    case 'CHAT_MESSAGE':
      if (message.payload?.sender && message.payload?.content) {
        pushLocalMessage(
            message.payload.sender,
            message.payload.content,
            message.payload.channel,
            false
        )
      }
      break

    case 'GAME_STATE_UPDATE':
      if (message.payload?.players) {
        gameState.value = message.payload
      }
      break

    case 'SYSTEM_MESSAGE':
      if (message.payload?.content) {
        pushLocalMessage(
            'SYSTÈME',
            message.payload.content,
            message.payload.channel || 'village',
            true
        )
      }
      break

    case 'ERROR':
      pushLocalMessage('SYSTÈME', `Erreur serveur: ${message.payload?.message}`, 'village', true)
      break
  }
}

/** Ajout d'un message à la liste locale avec timestamp */
const pushLocalMessage = (pseudo: string, content: string, channel: ChatChannel, isSystem = false) => {
  messages.value.push({
    id: crypto.randomUUID(), // Plus robuste que Date.now + Math.random
    pseudo,
    content,
    channel,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isSystem
  })
}

/** Envoi du message au serveur */
const handleSendMessage = () => {
  const content = newMessage.value.trim()
  if (!content) return

  if (connectionStatus.value !== 'open') {
    pushLocalMessage('SYSTÈME', 'Erreur: Non connecté au serveur.', currentChatChannel.value, true)
    return
  }

  if (content.length > MAX_MSG_LENGTH) {
    pushLocalMessage('SYSTÈME', `Message trop long (max ${MAX_MSG_LENGTH}).`, currentChatChannel.value, true)
    return
  }

  // Optimistic UI update
  pushLocalMessage('Moi', content, currentChatChannel.value)
  newMessage.value = ''

  sendMsg({
    type: 'CHAT_MESSAGE',
    payload: { channel: currentChatChannel.value, content }
  })
}

const toggleStreamerMode = () => {
  streamerMode.value = !streamerMode.value
  pushLocalMessage('SYSTÈME', `Mode Streamer ${streamerMode.value ? 'activé' : 'désactivé'}.`, 'village', true)
}

// --- INITIALISATION & LIFECYCLE ---

const initializeGame = async () => {
  showLoading()
  if (!gameID) {
    console.error("Game ID manquant")
    hideLoading()
    return
  }

  try {
    await connect()
    sendMsg({
      type: 'JOIN_GAME',
      payload: { id: gameID, user: oidcState.value.user?.profile?.name || 'Joueur' }
    })
  } catch (err) {
    console.error("Erreur WS:", err)
    pushLocalMessage('SYSTÈME', 'Échec connexion serveur.', 'village', true)
  } finally {
    hideLoading()
  }
}

// Watchers
watch(wsMessages, (msgs) => msgs.forEach(handleIncomingMessage), { deep: true })

watch(connectionStatus, (status) => {
  if (status === 'open') pushLocalMessage('SYSTÈME', 'Connexion rétablie !', 'village', true)
})

watch(wsError, (err) => {
  if (err) pushLocalMessage('SYSTÈME', 'Erreur connexion. Reconnexion...', 'village', true)
})

// Auto-scroll intelligent
watch(filteredMessages, async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}, { deep: true })

onMounted(initializeGame)
onUnmounted(() => close(1000, 'Unmounted'))
</script>

<template>
  <div class="shamus-wrapper flex min-h-screen w-full flex-col items-center justify-center p-2 md:p-4 font-['VT323']">

    <!-- HEADER -->
    <header class="mb-4 flex w-full max-w-4xl items-center justify-between px-2">
      <h1 class="text-3xl text-white drop-shadow-md">SHAMUS <span class="text-purple-400 text-xl">Ingame</span></h1>
      <div class="pixel-badge bg-red-900 text-red-200 px-3 py-1 text-lg">{{ currentPhaseText }}</div>
    </header>

    <!-- MAIN CONTAINER -->
    <div class="pixel-card w-full max-w-4xl flex flex-col h-[600px] relative">

      <!-- ERROR DISPLAY -->
      <ErrorDisplay
          v-if="wsError"
          :error="wsError"
          title="Erreur WebSocket"
          show-retry
          @retry="reconnect"
          class="m-4"
      />

      <!-- TABS -->
      <div class="flex border-b-4 border-[#08020d] bg-[#150a25]" role="tablist">
        <button
            v-for="tab in ['chat', 'composition', 'settings'] as const"
            :key="tab"
            @click="currentMainTab = tab"
            class="flex-1 py-3 text-2xl uppercase tracking-wider transition-colors border-r-2 border-[#08020d]"
            :class="currentMainTab === tab ? 'bg-[#241a3e] text-white' : 'bg-[#0f0518] text-gray-500 hover:bg-[#1a1025]'"
            :aria-selected="currentMainTab === tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- CONTENT AREA -->
      <div class="flex-grow relative overflow-hidden bg-[#241a3e] p-4">

        <!-- STATUS BADGE -->
        <div class="absolute top-2 right-2 z-10">
          <span class="text-xs px-2 py-1 rounded" :class="{
            'bg-green-900 text-green-200': connectionStatus === 'open',
            'bg-yellow-900 text-yellow-200': connectionStatus === 'connecting',
            'bg-red-900 text-red-200': ['closed', 'error'].includes(connectionStatus)
          }">
            {{ STATUS_LABELS[connectionStatus] || 'Inconnu' }}
          </span>
        </div>

        <!-- TAB: CHAT -->
        <div v-if="currentMainTab === 'chat'" class="h-full flex flex-col gap-2">
          <!-- Channels -->
          <div class="flex gap-2 mb-1">
            <button v-for="chan in ['village', 'loups', 'amoureux'] as const" :key="chan"
                    @click="currentChatChannel = chan"
                    class="px-4 py-1 text-xl border-t-2 border-x-2 rounded-t-sm transition-all capitalize"
                    :class="{
                'border-[#584c75] bg-[#2d2640] text-blue-200': currentChatChannel === chan && chan === 'village',
                'border-[#991b1b] bg-[#3a0b0b] text-red-300': currentChatChannel === chan && chan === 'loups',
                'border-[#d946ef] bg-[#381035] text-pink-300': currentChatChannel === chan && chan === 'amoureux',
                'border-transparent text-gray-500': currentChatChannel !== chan
              }"
            >
              {{ chan }}
            </button>
          </div>

          <!-- Messages Area -->
          <div ref="scrollContainer" class="flex-grow pixel-inset bg-[#050208] p-4 overflow-y-auto flex flex-col gap-3">
            <div v-if="filteredMessages.length === 0" class="text-center text-gray-600 italic mt-10">
              Aucun message...
            </div>

            <div v-for="msg in filteredMessages" :key="msg.id" class="animate-fade-in" :class="{'text-center my-2': msg.isSystem}">
              <span v-if="msg.isSystem" class="text-yellow-500 text-lg bg-yellow-900/10 px-4 py-1 border-y border-yellow-900/50">
                &lt; {{ msg.content }} &gt;
              </span>
              <div v-else class="flex gap-2 items-baseline text-left">
                <span class="text-gray-500 text-base">[{{ msg.timestamp }}]</span>
                <span class="text-xl font-bold whitespace-nowrap" :class="{
                  'text-blue-400': msg.channel === 'village',
                  'text-red-500': msg.channel === 'loups',
                  'text-pink-400': msg.channel === 'amoureux'
                }">{{ msg.pseudo }}:</span>
                <span class="text-xl text-gray-200 break-words">{{ msg.content }}</span>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="flex gap-2 mt-2">
            <input
                v-model="newMessage"
                @keyup.enter="handleSendMessage"
                type="text"
                class="pixel-inset flex-grow bg-[#0f0518] text-white px-4 py-2 text-xl focus:outline-none focus:border-purple-500"
                placeholder="Écrivez votre message..."
                :disabled="connectionStatus !== 'open'"
            />
            <button @click="handleSendMessage"
                    class="btn-pixel-secondary px-6 text-xl uppercase"
                    :disabled="connectionStatus !== 'open' || !newMessage.trim()"
            >
              Envoyer
            </button>
          </div>
        </div>

        <!-- TAB: COMPOSITION -->
        <div v-else-if="currentMainTab === 'composition'" class="h-full overflow-y-auto">
          <!-- Vivants -->
          <h2 class="text-2xl text-purple-300 mb-4 border-b border-purple-900 pb-2">
            Joueurs Vivants ({{ livingPlayers.length }})
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div v-for="player in livingPlayers" :key="player.id" class="bg-[#1e1b29] p-3 border-2 border-[#584c75] flex justify-between items-center">
              <span class="text-xl text-white">{{ player.name }}</span>
              <span class="text-green-500">Vivant</span>
            </div>
          </div>

          <!-- Morts -->
          <h2 class="text-2xl text-red-400 mb-4 border-b border-red-900 pb-2 mt-8">
            Cimetière ({{ deadPlayers.length }})
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="player in deadPlayers" :key="player.id" class="bg-[#150a1a] p-3 border-2 border-[#2a1d3a] flex justify-between items-center opacity-60">
              <span class="text-gray-400 line-through">{{ player.name }}</span>
              <span class="text-red-700">Mort</span>
            </div>
          </div>
        </div>

        <!-- TAB: PARAMÈTRES -->
        <div v-else-if="currentMainTab === 'settings'" class="h-full flex flex-col gap-6 p-4">
          <div class="flex items-center gap-4 cursor-pointer select-none" @click="toggleStreamerMode">
            <div class="w-6 h-6 border-2 border-white flex items-center justify-center">
              <div v-if="streamerMode" class="w-3 h-3 bg-white"></div>
            </div>
            <span class="text-2xl text-gray-300">Mode Streamer (Cacher rôles)</span>
          </div>

          <div class="mt-auto">
            <button @click="reconnect()" class="btn-pixel-secondary px-6 py-2 text-xl w-full md:w-auto" :disabled="connectionStatus === 'connecting'">
              {{ connectionStatus === 'connecting' ? 'Connexion...' : 'Forcer la reconnexion' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
/* Conserver les styles existants, ils sont corrects pour du pixel art */
/* J'ai juste nettoyé les commentaires inutiles */
.pixel-badge { border: 2px solid #08020d; box-shadow: 2px 2px 0 rgba(0,0,0,0.5); }
.pixel-card {
  background-color: var(--color-night-light);
  border: 4px solid var(--color-border-light);
  border-right-color: var(--color-border-dark);
  border-bottom-color: var(--color-border-dark);
  box-shadow: 8px 8px 0 rgba(0,0,0,0.6);
}
.pixel-inset {
  border-top: 2px solid var(--color-border-dark);
  border-left: 2px solid var(--color-border-dark);
  border-right: 2px solid var(--color-border-light);
  border-bottom: 2px solid var(--color-border-light);
}
::-webkit-scrollbar { width: 12px; background: #0f0518; }
::-webkit-scrollbar-thumb { background: #584c75; border: 2px solid #0f0518; }
::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
.btn-pixel-secondary {
  background-color: #241a3e; color: var(--color-moon);
  border: 2px solid;
  border-color: var(--color-border-light) var(--color-border-dark) var(--color-border-dark) var(--color-border-light);
  transition: transform 0.1s;
}
.btn-pixel-secondary:active { transform: translateY(2px); }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.shamus-wrapper {
  --color-night-dark: #0f0518; --color-night-light: #241a3e; --color-moon: #e2e8f0;
  --color-blood: #dc2626; --color-border-light: #584c75; --color-border-dark: #08020d;
}
</style>
