<script setup lang="ts">
import { ref, computed, nextTick, onMounted, inject, onUnmounted, watch, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { useWebSocket, type WebSocketMessage, type WebSocketStatus, type UseWebSocketReturn } from "@/composables/useWebSocket"
import { userManager } from '@/oidc'
import {
  type MainTab,
  type ChatChannel,
} from "@/types/ui.ts"
import type { RoleType } from "@/types/roles.ts"
import ErrorDisplay from "@/components/ErrorDisplay.vue"
import {
  type GameDataEventData,
  type ChatMessageEvent,
  type Event,
  type GameSettingsEventData,
  EventChannelGameEvent,
  EventChannelSettings,
  EventTypeChatMessage,
  EventTypeGameData,
  EventTypeGameSettings,
} from "@/types/events.ts";

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

// Configuration des rôles (extensible)
const ROLE_CONFIG: Record<RoleType, { name: string; color: string; maxCount?: number }> = {
  villager: { name: 'Villageois', color: 'text-blue-400' },
  werewolf: { name: 'Loup-Garou', color: 'text-red-500' },
  seer: { name: 'Voyante', color: 'text-purple-400', maxCount: 1 },
  witch: { name: 'Sorcière', color: 'text-green-400', maxCount: 1 }
}

// --- INJECTIONS ---
const route = useRoute()
const showLoading = inject<() => void>('showLoading', () => {})
const hideLoading = inject<() => void>('hideLoading', () => {})

// --- CONFIGURATION WEBSOCKET (Approche Impérative) ---
const gameID = route.query.gameID as string

// On stocke l'instance du composable ici (shallowRef car l'objet retourné n'a pas besoin d'être deep reactive)
const wsInstance = shallowRef<UseWebSocketReturn | null>(null)

// --- PROXIES REACTIFS (Pour garder le template propre) ---
// Ces computed permettent d'utiliser les variables dans le template même si wsInstance est null au début
const connectionStatus = computed(() => wsInstance.value?.status.value ?? 'closed')
const wsError = computed(() => wsInstance.value?.error.value ?? null)

// Wrappers pour les fonctions
const send = (data: any) => wsInstance.value?.send(data)
const close = (code?: number, reason?: string) => wsInstance.value?.close(code, reason)
const reconnect = async () => await wsInstance.value?.reconnect()

// --- STATE: UI & OPTIONS ---
const currentMainTab = ref<MainTab>('chat')
const streamerMode = ref(false)

// --- STATE: UTILISATEUR ---
const currentUserId = ref<string | null>(null)

// --- STATE: ERREURS ---
const settingsError = ref<string | null>(null)
let settingsErrorTimeout: ReturnType<typeof setTimeout> | null = null

// --- STATE: DEBOUNCE SETTINGS ---
const pendingRoles = ref<Record<RoleType, number> | null>(null)
const lastConfirmedRoles = ref<Record<RoleType, number> | null>(null)
let settingsDebounceTimeout: ReturnType<typeof setTimeout> | null = null
const SETTINGS_DEBOUNCE_DELAY = 300 // ms

// --- STATE: JEU & JOUEURS ---
// Utilisation de GameDataEventData pour stocker l'état complet du jeu
const actualGame = ref<GameDataEventData | null>(null)

// --- COMPUTED: HOST STATUS ---
const isHost = computed(() => {
  if (!actualGame.value || !currentUserId.value) return false
  return actualGame.value.host === currentUserId.value
})

// --- COMPUTED: GAME STATUS ---
const isWaiting = computed(() => actualGame.value?.status === 'waiting')
const canEditSettings = computed(() => isHost.value && isWaiting.value)

// --- COMPUTED: ROLES ---
const totalRoles = computed(() => {
  if (!actualGame.value?.settings?.roles) return 0
  return Object.values(actualGame.value.settings.roles).reduce((sum, count) => sum + count, 0)
})

const playerCount = computed(() => actualGame.value?.players?.length ?? 0)

const rolesMatchPlayers = computed(() => totalRoles.value === playerCount.value)

const rolesList = computed(() => {
  if (!actualGame.value?.settings?.roles) return []
  return Object.entries(actualGame.value.settings.roles).map(([role, count]) => ({
    type: role as RoleType,
    count: count as number,
    config: ROLE_CONFIG[role as RoleType] || { name: role, color: 'text-gray-400' }
  }))
})

const livingPlayers = computed(() => actualGame.value?.players.filter(p => p.alive) ?? [])
const deadPlayers = computed(() => actualGame.value?.players.filter(p => !p.alive) ?? [])

const currentPhaseText = computed(() => {
  if (!actualGame.value) return 'CHARGEMENT...'
  return actualGame.value.phase === 'day'
      ? `JOUR ${actualGame.value.day}`
      : `NUIT ${actualGame.value.day}`
})

// --- STATE: CHAT ---
const currentChatChannel = ref<ChatChannel>('village')
const newMessage = ref('')

// --- COMPUTED: CHAT RESTRICTIONS ---
const isNight = computed(() => actualGame.value?.phase === 'night')

const availableChannels = computed<ChatChannel[]>(() => {
  // La nuit: seuls loups et amoureux peuvent parler dans leurs channels
  if (isNight.value) {
    return ['loups', 'amoureux']
  }
  // Le jour (et phases start/vote): seul le village est ouvert
  return ['village']
})

const canSendToCurrentChannel = computed(() => {
  return availableChannels.value.includes(currentChatChannel.value)
})

const chatPlaceholder = computed(() => {
  if (connectionStatus.value !== 'open') {
    return 'Connexion en cours...'
  }
  if (!canSendToCurrentChannel.value) {
    if (isNight.value && currentChatChannel.value === 'village') {
      return 'Le village dort... Silence !'
    }
    return 'Ce channel est fermé pendant le jour.'
  }
  return 'Écrivez votre message...'
})

// Extension locale pour l'affichage (ajout ID, timestamp, isSystem)
type UIMessage = ChatMessageEvent & {
  id: string
  isSystem: boolean
  timestamp: string
}

const messages = ref<UIMessage[]>([])
const scrollContainer = ref<HTMLDivElement | null>(null)

const filteredMessages = computed(() =>
    messages.value.filter(m => m.channel === currentChatChannel.value)
)

// --- LOGIQUE MÉTIER ---

/** Gestion de l'ajout d'un message local */
const pushLocalMessage = (playerID: string, messageContent: string, channel: string, nickname: string = 'Inconnu', isSystem = false) => {
  messages.value.push({
    id: crypto.randomUUID(),
    playerID,
    nickname,
    message: messageContent,
    channel,
    isSystem,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

/** Handler pour les messages de chat */
const handleChatMessage = (data: ChatMessageEvent) => {
  messages.value.push({
    ...data,
    id: crypto.randomUUID(),
    isSystem: false,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })
}

/** Handler pour la mise à jour des données de jeu (remplace updateDay et updateComposition) */
const handleGameData = (data: GameDataEventData) => {
  actualGame.value = data
  // Sauvegarder l'état initial des roles pour rollback éventuel
  if (data.settings?.roles) {
    lastConfirmedRoles.value = { ...data.settings.roles }
  }
}

/** Handler pour la mise à jour des paramètres de jeu */
const handleSettingsUpdate = (data: GameSettingsEventData) => {
  if (actualGame.value) {
    actualGame.value = {
      ...actualGame.value,
      settings: { roles: data.roles }
    }
    // Sauvegarder l'état confirmé par le serveur pour rollback éventuel
    lastConfirmedRoles.value = { ...data.roles }
    pendingRoles.value = null
  }
}

/** Envoie les settings en attente au serveur */
const sendPendingSettings = () => {
  if (!pendingRoles.value) return

  const event: Event<GameSettingsEventData> = {
    channel: EventChannelSettings,
    type: EventTypeGameSettings,
    data: { roles: pendingRoles.value }
  }

  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error('Erreur envoi settings:', e)
    pushLocalMessage('system', 'Erreur lors de la mise à jour des paramètres.', 'village', 'SYSTÈME', true)
  }

  pendingRoles.value = null
}

/** Modifie un rôle avec debounce pour éviter le spam de requêtes */
const updateRoleCount = (roleType: RoleType, delta: number) => {
  if (!actualGame.value?.settings?.roles || !canEditSettings.value) return

  // Utiliser les roles en attente s'ils existent, sinon les actuels
  const baseRoles = pendingRoles.value || { ...actualGame.value.settings.roles }
  const currentCount = baseRoles[roleType] || 0
  const newCount = Math.max(0, currentCount + delta)

  // Mise à jour locale immédiate pour un feedback instantané
  const newRoles = { ...baseRoles, [roleType]: newCount }
  pendingRoles.value = newRoles

  // Appliquer aussi à l'état local pour affichage immédiat
  if (actualGame.value) {
    actualGame.value = {
      ...actualGame.value,
      settings: { roles: newRoles }
    }
  }

  // Debounce: annuler le timeout précédent et en créer un nouveau
  if (settingsDebounceTimeout) clearTimeout(settingsDebounceTimeout)
  settingsDebounceTimeout = setTimeout(sendPendingSettings, SETTINGS_DEBOUNCE_DELAY)
}

/** Affiche une erreur temporaire dans l'UI et rollback les modifications */
const showSettingsError = (message: string) => {
  settingsError.value = message
  
  // Annuler tout envoi en attente
  if (settingsDebounceTimeout) {
    clearTimeout(settingsDebounceTimeout)
    settingsDebounceTimeout = null
  }
  pendingRoles.value = null
  
  // Rollback vers le dernier état confirmé par le serveur
  if (lastConfirmedRoles.value && actualGame.value) {
    actualGame.value = {
      ...actualGame.value,
      settings: { roles: { ...lastConfirmedRoles.value } }
    }
  }
  
  if (settingsErrorTimeout) clearTimeout(settingsErrorTimeout)
  settingsErrorTimeout = setTimeout(() => {
    settingsError.value = null
  }, 5000)
}

/** Gestion centralisée des messages entrants (Dispatcher) */
const handleIncomingMessage = (message: WebSocketMessage) => {
  // Gestion des messages d'erreur texte brut du serveur
  if (message.type === 'text' && message.payload) {
    showSettingsError(message.payload as string)
    return
  }

  // Casting vers l'interface Event générique
  const event = message as Event<any>

  // Vérification basique
  if (!event || !event.type) return

  // Logique de dispatch selon le channel et le type
  if (event.channel === EventChannelGameEvent) {
    switch (event.type) {
      case EventTypeChatMessage:
        handleChatMessage(event.data as ChatMessageEvent)
        break
      case EventTypeGameData:
        handleGameData(event.data as GameDataEventData)
        break
      default:
        console.log("Event Game non géré:", event.type, event.data)
    }
  } else if (event.channel === EventChannelSettings) {
    switch (event.type) {
      case EventTypeGameSettings:
        handleSettingsUpdate(event.data as GameSettingsEventData)
        break
      default:
        console.log("Event Settings non géré:", event.type, event.data)
    }
  } else {
    // Autres channels si nécessaire
    console.log("Channel non géré:", event.channel, event.data)
  }
}

/** Envoi du message au serveur */
const handleSendMessage = () => {
  const content = newMessage.value.trim()
  if (!content) return

  if (connectionStatus.value !== 'open') {
    pushLocalMessage('system', 'Erreur: Non connecté au serveur.', currentChatChannel.value, 'SYSTÈME', true)
    return
  }

  // Vérifier si le channel est disponible selon la phase
  if (!canSendToCurrentChannel.value) {
    const reason = isNight.value 
      ? 'Le village dort pendant la nuit.' 
      : 'Ce channel est fermé pendant le jour.'
    pushLocalMessage('system', reason, currentChatChannel.value, 'SYSTÈME', true)
    return
  }

  if (content.length > MAX_MSG_LENGTH) {
    pushLocalMessage('system', `Message trop long (max ${MAX_MSG_LENGTH}).`, currentChatChannel.value, 'SYSTÈME', true)
    return
  }

  newMessage.value = ''

  // Construction de l'événement à envoyer
  // Note: Le serveur attend probablement un Event<ChatMessageEvent>
  // Mais l'interface d'envoi peut différer de celle de réception (pas d'ID joueur par ex).
  // On assume ici que le serveur complète les infos manquantes (playerID, nickname).

  const chatData: ChatMessageEvent = {
    playerID: '',
    message: content,
    channel: currentChatChannel.value,
    nickname: ''
  }

  const event: Event<ChatMessageEvent> = {
    channel: EventChannelGameEvent,
    type: EventTypeChatMessage,
    data: chatData
  }

  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error("Erreur envoi", e)
  }
}

const toggleStreamerMode = () => {
  streamerMode.value = !streamerMode.value
  pushLocalMessage('system', `Mode Streamer ${streamerMode.value ? 'activé' : 'désactivé'}.`, 'village', 'SYSTÈME', true)
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
    const user = await userManager.getUser()

    if (!user || user.expired) {
      console.warn("Utilisateur non authentifié, redirection...")
      await userManager.signinRedirect({ state: { path: route.fullPath } })
      return
    }

    // Stocker l'ID utilisateur pour vérifier le statut host
    currentUserId.value = user.profile.sub || null

    const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
    const finalUrl = `${baseUrl}/app/ws/${gameID}?access_token=${user.access_token}`

    // Initialisation du WebSocket avec la nouvelle API
    wsInstance.value = useWebSocket(finalUrl, {
      autoReconnect: true,
      reconnectDelay: RECONNECT_DELAY,
      maxReconnectAttempts: 10,
      // On passe directement le handler ici
      onReceive: handleIncomingMessage
    })

    await wsInstance.value.connect()

  } catch (err) {
    console.error("Erreur Init/WS:", err)
    pushLocalMessage('system', 'Échec connexion serveur.', 'village', 'SYSTÈME', true)
  } finally {
    hideLoading()
  }
}

// Watchers
// Note: Le watcher sur wsMessages a été supprimé car on utilise onReceive maintenant.

watch(connectionStatus, (status) => {
  if (status === 'open') {
    hideLoading()
    pushLocalMessage('system', 'Connexion rétablie !', 'village', 'SYSTÈME', true)
  }
  if (status === 'closed') {
    showLoading()
    pushLocalMessage('system', 'Erreur connexion. Reconnexion...', 'village', 'SYSTÈME', true)
  }
})

watch(wsError, (err) => {
  if (err) {
    showLoading()
    pushLocalMessage('system', 'Erreur connexion. Reconnexion...', 'village', 'SYSTÈME', true)
  }
})

watch(filteredMessages, async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}, { deep: true })

onMounted(initializeGame)

onUnmounted(() => {
  if (wsInstance.value) {
    wsInstance.value.close(1000, 'Component Unmounted')
  }
  // Nettoyer les timeouts
  if (settingsDebounceTimeout) clearTimeout(settingsDebounceTimeout)
  if (settingsErrorTimeout) clearTimeout(settingsErrorTimeout)
})
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
            <button 
                v-for="chan in ['village', 'loups', 'amoureux'] as const" 
                :key="chan"
                @click="availableChannels.includes(chan) && (currentChatChannel = chan)"
                :disabled="!availableChannels.includes(chan)"
                class="px-4 py-1 text-xl border-t-2 border-x-2 rounded-t-sm transition-all capitalize"
                :class="{
                  'border-[#584c75] bg-[#2d2640] text-blue-200': currentChatChannel === chan && chan === 'village' && availableChannels.includes(chan),
                  'border-[#991b1b] bg-[#3a0b0b] text-red-300': currentChatChannel === chan && chan === 'loups' && availableChannels.includes(chan),
                  'border-[#d946ef] bg-[#381035] text-pink-300': currentChatChannel === chan && chan === 'amoureux' && availableChannels.includes(chan),
                  'border-transparent text-gray-500': currentChatChannel !== chan && availableChannels.includes(chan),
                  'opacity-40 cursor-not-allowed border-transparent text-gray-600': !availableChannels.includes(chan)
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
                &lt; {{ msg.message }} &gt;
              </span>
              <div v-else class="flex gap-2 items-baseline text-left">
                <span class="text-gray-500 text-base">[{{ msg.timestamp }}]</span>
                <span class="text-xl font-bold whitespace-nowrap" :class="{
                  'text-blue-400': msg.channel === 'village',
                  'text-red-500': msg.channel === 'loups',
                  'text-pink-400': msg.channel === 'amoureux'
                }">{{ msg.nickname }}:</span>
                <span class="text-xl text-gray-200 break-words">{{ msg.message }}</span>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="flex gap-2 mt-2">
            <input
                v-model="newMessage"
                @keyup.enter="handleSendMessage"
                type="text"
                class="pixel-inset flex-grow bg-[#0f0518] text-white px-4 py-2 text-xl focus:outline-none focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                :placeholder="chatPlaceholder"
                :disabled="connectionStatus !== 'open' || !canSendToCurrentChannel"
            />
            <button @click="handleSendMessage"
                    class="btn-pixel-secondary px-6 text-xl uppercase disabled:opacity-40 disabled:cursor-not-allowed"
                    :disabled="connectionStatus !== 'open' || !newMessage.trim() || !canSendToCurrentChannel"
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
              <span class="text-xl text-white">{{ player.username }}</span>
              <span class="text-green-500">Vivant</span>
            </div>
          </div>

          <!-- Morts -->
          <h2 class="text-2xl text-red-400 mb-4 border-b border-red-900 pb-2 mt-8">
            Cimetière ({{ deadPlayers.length }})
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="player in deadPlayers" :key="player.id" class="bg-[#150a1a] p-3 border-2 border-[#2a1d3a] flex justify-between items-center opacity-60">
              <span class="text-gray-400 line-through">{{ player.username }}</span>
              <span class="text-red-700">Mort</span>
            </div>
          </div>
        </div>

        <!-- TAB: PARAMÈTRES -->
        <div v-else-if="currentMainTab === 'settings'" class="h-full flex flex-col gap-6 p-4 overflow-y-auto">
          
          <!-- Section: Composition des rôles -->
          <div class="space-y-4">
            <div class="flex items-center justify-between border-b border-purple-900 pb-2">
              <h2 class="text-2xl text-purple-300">Composition des rôles</h2>
              <div class="flex items-center gap-2">
                <span 
                  class="text-lg px-2 py-0.5 border"
                  :class="rolesMatchPlayers 
                    ? 'text-green-400 border-green-700 bg-green-900/20' 
                    : 'text-yellow-400 border-yellow-700 bg-yellow-900/20'"
                >
                  {{ playerCount }} joueurs
                </span>
                <span class="text-gray-500">/</span>
                <span class="text-lg text-white font-bold">{{ totalRoles }} rôles</span>
              </div>
            </div>

            <!-- Badge Host -->
            <div v-if="isHost" class="inline-flex items-center gap-2 px-3 py-1 bg-yellow-900/30 border border-yellow-700 text-yellow-400 text-sm">
              <span>★</span> Vous êtes l'hôte
              <span v-if="!isWaiting" class="text-yellow-600">(modifications désactivées)</span>
            </div>

            <!-- Message d'erreur serveur -->
            <div 
              v-if="settingsError" 
              class="flex items-center gap-2 px-3 py-2 bg-red-900/40 border border-red-700 text-red-300 text-sm animate-fade-in"
            >
              <span>⚠</span>
              <span>{{ settingsError }}</span>
            </div>

            <!-- Liste des rôles -->
            <div class="grid gap-3">
              <div 
                v-for="role in rolesList" 
                :key="role.type"
                class="bg-[#1e1b29] p-4 border-2 border-[#584c75] flex items-center justify-between"
              >
                <div class="flex items-center gap-3">
                  <span class="text-2xl" :class="role.config.color">{{ role.config.name }}</span>
                  <span v-if="role.config.maxCount" class="text-sm text-gray-500">(max {{ role.config.maxCount }})</span>
                </div>
                
                <div class="flex items-center gap-3">
                  <!-- Contrôles de modification (Host uniquement, jeu en attente) -->
                  <template v-if="canEditSettings">
                    <button 
                      @click="updateRoleCount(role.type, -1)"
                      :disabled="role.count <= 0"
                      class="w-10 h-10 text-2xl bg-[#3a0b0b] border-2 border-red-900 text-red-400 hover:bg-red-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      -
                    </button>
                    <span class="text-3xl font-bold text-white w-12 text-center">{{ role.count }}</span>
                    <button 
                      @click="updateRoleCount(role.type, 1)"
                      class="w-10 h-10 text-2xl bg-[#0b3a1a] border-2 border-green-900 text-green-400 hover:bg-green-900/50 transition-colors"
                    >
                      +
                    </button>
                  </template>
                  
                  <!-- Affichage simple (non-host ou jeu actif) -->
                  <span v-else class="text-3xl font-bold text-white">{{ role.count }}</span>
                </div>
              </div>
            </div>

            <!-- Message d'info pour non-host -->
            <p v-if="!isHost && isWaiting" class="text-sm text-gray-500 italic">
              Seul l'hôte peut modifier la composition des rôles.
            </p>
          </div>

          <!-- Séparateur -->
          <div class="border-t border-[#584c75] my-2"></div>
          
          <!-- Section: Options locales -->
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
