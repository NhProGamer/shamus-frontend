<script setup lang="ts">
import { ref, computed, nextTick, onMounted, inject, onUnmounted, watch, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWebSocket, type WebSocketMessage, type WebSocketStatus, type UseWebSocketReturn } from "@/composables/useWebSocket"
import { userManager } from '@/oidc'
import { useGameStore } from '@/stores/gameStore'
import {
  type MainTab,
  type ChatChannel,
  type UIMessage,
} from "@/types/ui"
import type { RoleType } from "@/types/roles"
import type { PlayerID } from "@/types/player"
import ErrorDisplay from "@/components/ErrorDisplay.vue"

// Game components
import TimerDisplay from "@/components/game/TimerDisplay.vue"
import StartGameButton from "@/components/game/StartGameButton.vue"
import VotePanel from "@/components/game/VotePanel.vue"
import NightActionModal from "@/components/game/NightActionModal.vue"
import WinModal from "@/components/game/WinModal.vue"
import ToastNotification from "@/components/game/ToastNotification.vue"
import ActionModal from "@/components/game/actions/ActionModal.vue"

// Stores
import { useNotificationStore } from '@/stores/notificationStore'

// Utils
import { getErrorMessage } from '@/utils/errorMessages'

import {
  type ChatMessageEvent,
  type Event,
  type GameSettingsEventData,
  type GameDataEventData,
  type TimerEventData,
  type TurnEventData,
  type VoteEventData,
  type DayEventData,
  type NightEventData,
  type DeathEventData,
  type WinEventData,
  type RoleRevealEventData,
  type SeerRevealEventData,
  type ErrorEventData,
  type AckEventData,
  type HostChangeEventData,
  type ConnectionEvent,
  type DisconnectionEvent,
  type ReconnectionEventData,
  type InactiveEventData,
  EventChannelGameEvent,
  EventChannelSettings,
  EventChannelTimer,
  EventChannelConnexion,
  EventChannelAction,
  EventTypeChatMessage,
  EventTypeGameData,
  EventTypeGameSettings,
  EventTypeTimer,
  EventTypeTurn,
  EventTypeVote,
  EventTypeDay,
  EventTypeNight,
  EventTypeDeath,
  EventTypeWin,
  EventTypeRoleReveal,
  EventTypeSeerReveal,
  EventTypeStartGame,
  EventTypeVillageVote,
  EventTypeSeerAction,
  EventTypeWerewolfVote,
  EventTypeWitchAction,
  EventTypeError,
  EventTypeAck,
  EventTypeGameHostChange,
  EventTypeConnection,
  EventTypeDisconnection,
  EventTypeReconnection,
  EventTypeInactive,
  EventTypeActionCreated,
  EventTypeActionExpired,
} from "@/types/events"

import type {
  ActionCreatedEventData,
  ActionExpiredEventData,
  ActionResponse,
} from "@/types/actions"

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

// Game constants (from backend)
const MIN_PLAYERS = 4
const MAX_PLAYERS = 24

// Configuration des rôles (extensible)
const ROLE_CONFIG: Record<RoleType, { name: string; color: string; maxCount?: number }> = {
  villager: { name: 'Villageois', color: 'text-blue-400' },
  werewolf: { name: 'Loup-Garou', color: 'text-red-500' },
  seer: { name: 'Voyante', color: 'text-purple-400', maxCount: 1 },
  witch: { name: 'Sorcière', color: 'text-green-400', maxCount: 1 }
}

// --- INJECTIONS ---
const route = useRoute()
const router = useRouter()
const showLoading = inject<() => void>('showLoading', () => {})
const hideLoading = inject<() => void>('hideLoading', () => {})

// --- PINIA STORES ---
const gameStore = useGameStore()
const notificationStore = useNotificationStore()
const {
  game,
  timer,
  voteState,
  nightTurn,
  winData,
  myRole,
  isHost,
  isWaiting,
  isStarted,
  isEnded,
  isVotePhase,
  isNight,
  isDay,
  currentPhase,
  currentDay,
  livingPlayers,
  deadPlayers,
  playerCount,
  totalRoles,
  rolesMatchPlayers,
  isMyTurn,
  isAlive,
  currentAction,
  hasActiveAction,
} = storeToRefs(gameStore)

// --- CONFIGURATION WEBSOCKET (Approche Impérative) ---
const gameID = route.query.gameID as string

// On stocke l'instance du composable ici (shallowRef car l'objet retourné n'a pas besoin d'être deep reactive)
const wsInstance = shallowRef<UseWebSocketReturn | null>(null)

// --- PROXIES REACTIFS (Pour garder le template propre) ---
const connectionStatus = computed(() => wsInstance.value?.status.value ?? 'closed')
const wsError = computed(() => wsInstance.value?.error.value ?? null)

// Wrappers pour les fonctions
const send = (data: any) => wsInstance.value?.send(data)
const close = (code?: number, reason?: string) => wsInstance.value?.close(code, reason)
const reconnect = async () => await wsInstance.value?.reconnect()

// --- STATE: UI & OPTIONS ---
const currentMainTab = ref<MainTab>('chat')
const streamerMode = ref(false)
const codeCopied = ref(false)

// --- STATE: ERREURS ---
const settingsError = ref<string | null>(null)
let settingsErrorTimeout: ReturnType<typeof setTimeout> | null = null

// --- STATE: DEBOUNCE SETTINGS ---
const pendingRoles = ref<Record<RoleType, number> | null>(null)
const lastConfirmedRoles = ref<Record<RoleType, number> | null>(null)
let settingsDebounceTimeout: ReturnType<typeof setTimeout> | null = null
const SETTINGS_DEBOUNCE_DELAY = 300 // ms

// --- COMPUTED: GAME STATUS (from store) ---
const canEditSettings = computed(() => isHost.value && isWaiting.value)

// --- COMPUTED: ROLES ---
const rolesList = computed(() => {
  if (!game.value?.settings?.roles) return []
  return Object.entries(game.value.settings.roles).map(([role, count]) => ({
    type: role as RoleType,
    count: count as number,
    config: ROLE_CONFIG[role as RoleType] || { name: role, color: 'text-gray-400' }
  }))
})

const currentPhaseText = computed(() => {
  if (!game.value) return 'CHARGEMENT...'
  return game.value.phase === 'day'
      ? `JOUR ${game.value.day}`
      : `NUIT ${game.value.day}`
})

// --- STATE: CHAT ---
const currentChatChannel = ref<ChatChannel>('village')
const newMessage = ref('')

// --- COMPUTED: CHAT RESTRICTIONS ---
// Available channels based on player ROLE (not phase)
const availableChannels = computed<ChatChannel[]>(() => {
  const channels: ChatChannel[] = ['village'] // Always visible to everyone
  
  // Werewolf channel: only for werewolves
  if (myRole.value === 'werewolf') {
    channels.push('werewolf')
  }
  
  // Lovers channel: TODO - implement when Cupid role is added
  // Currently not functional as Cupid is not implemented in backend
  // if (hasLoversClan.value) {
  //   channels.push('lovers')
  // }
  
  return channels
})

// Can the player SEND messages to the current channel?
// Visibility (availableChannels) != Permission to send (canSendToCurrentChannel)
const canSendToCurrentChannel = computed(() => {
  // Dead players cannot send messages (backend rule)
  if (!isAlive.value) return false
  
  // Check permissions based on channel and game phase
  switch (currentChatChannel.value) {
    case 'village':
      // Village: only during day phases (Day/Vote/Start)
      // Aligns with backend: helpers.IsDayPhase(gamePhase)
      return currentPhase.value === 'day' || currentPhase.value === 'vote' || currentPhase.value === 'start'
    
    case 'werewolf':
      // Werewolf: only during night AND must be a werewolf
      // Aligns with backend: gamePhase == entities.PhaseNight && helpers.IsWerewolf(sender)
      return isNight.value && myRole.value === 'werewolf'
    
    case 'lovers':
      // Lovers: not implemented yet (Cupid missing)
      return false
    
    default:
      return false
  }
})

const chatPlaceholder = computed(() => {
  // Not connected
  if (connectionStatus.value !== 'open') {
    return 'Connexion en cours...'
  }
  
  // Dead players cannot send
  if (!isAlive.value) {
    return 'Les morts ne peuvent pas parler...'
  }
  
  // Cannot send to current channel
  if (!canSendToCurrentChannel.value) {
    switch (currentChatChannel.value) {
      case 'village':
        return 'Le village dort... (lecture seule)'
      case 'werewolf':
        return 'Les loups-garous ne peuvent parler que la nuit'
      case 'lovers':
        return 'Channel non disponible'
      default:
        return 'Channel fermé'
    }
  }
  
  // Can send
  return 'Écrivez votre message...'
})

// Extension locale pour l'affichage (ajout ID, timestamp, isSystem)

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

/** Handler pour la mise à jour des données de jeu */
const handleGameData = (data: GameDataEventData) => {
  gameStore.handleGameData(data)
  // Sauvegarder l'état initial des roles pour rollback éventuel
  if (data.settings?.roles) {
    lastConfirmedRoles.value = { ...data.settings.roles }
  }
}

/** Handler pour la mise à jour des paramètres de jeu */
const handleSettingsUpdate = (data: GameSettingsEventData) => {
  if (game.value) {
    // Update store via handleGameData
    gameStore.handleGameData({
      ...game.value,
      settings: { roles: data.roles }
    })
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
  if (!game.value?.settings?.roles || !canEditSettings.value) return

  // Utiliser les roles en attente s'ils existent, sinon les actuels
  const baseRoles = pendingRoles.value || { ...game.value.settings.roles }
  const currentCount = baseRoles[roleType] || 0
  const newCount = Math.max(0, currentCount + delta)

  // Validation: vérifier la limite du rôle
  const roleLimit = ROLE_CONFIG[roleType]?.maxCount
  if (roleLimit && newCount > roleLimit) {
    showSettingsError(`Maximum ${roleLimit} ${ROLE_CONFIG[roleType].name} autorisé(e)`)
    return
  }

  // Validation: vérifier le total des rôles
  const newRoles = { ...baseRoles, [roleType]: newCount }
  const totalRoles = Object.values(newRoles).reduce((sum, count) => sum + count, 0)
  
  if (totalRoles > MAX_PLAYERS) {
    showSettingsError(`Maximum ${MAX_PLAYERS} rôles au total`)
    return
  }

  // Mise à jour locale immédiate pour un feedback instantané
  pendingRoles.value = newRoles

  // Appliquer aussi à l'état local pour affichage immédiat
  if (game.value) {
    gameStore.handleGameData({
      ...game.value,
      settings: { roles: newRoles }
    })
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
  if (lastConfirmedRoles.value && game.value) {
    gameStore.handleGameData({
      ...game.value,
      settings: { roles: { ...lastConfirmedRoles.value } }
    })
  }
  
  if (settingsErrorTimeout) clearTimeout(settingsErrorTimeout)
  settingsErrorTimeout = setTimeout(() => {
    settingsError.value = null
  }, 5000)
}

// ========================
// ACTION SENDING FUNCTIONS
// ========================

/** Start game (host only) */
const sendStartGame = () => {
  if (!isHost.value || !isWaiting.value) return
  
  gameStore.setActionLoading('start_game', true)
  
  const event: Event<{}> = {
    channel: EventChannelGameEvent,
    type: EventTypeStartGame,
    data: {}
  }
  
  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error('Erreur envoi start_game:', e)
    gameStore.setActionLoading('start_game', false)
    pushLocalMessage('system', 'Erreur lors du lancement de la partie.', 'village', 'SYSTÈME', true)
  }
}

/** Village vote */
const sendVillageVote = (targetId: PlayerID | null) => {
  // Find target player name for confirmation
  let confirmMessage = 'Êtes-vous sûr de vouloir vous abstenir ?'
  if (targetId) {
    const targetPlayer = gameStore.players.find(p => p.id === targetId)
    const targetName = targetPlayer?.username || 'ce joueur'
    confirmMessage = `Êtes-vous sûr de vouloir voter contre ${targetName} ?`
  }
  
  // Ask for confirmation
  if (!confirm(confirmMessage)) {
    return
  }
  
  gameStore.setActionLoading('village_vote', true)
  
  const event: Event<{ targetId: PlayerID | null }> = {
    channel: EventChannelGameEvent,
    type: EventTypeVillageVote,
    data: { targetId }
  }
  
  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error('Erreur envoi village_vote:', e)
    gameStore.setActionLoading('village_vote', false)
    pushLocalMessage('system', 'Erreur lors de l\'envoi du vote.', 'village', 'SYSTÈME', true)
  }
}

/** Seer action */
const sendSeerAction = (targetId: PlayerID) => {
  gameStore.setActionLoading('seer_action', true)
  
  const event: Event<{ targetId: PlayerID }> = {
    channel: EventChannelGameEvent,
    type: EventTypeSeerAction,
    data: { targetId }
  }
  
  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error('Erreur envoi seer_action:', e)
    gameStore.setActionLoading('seer_action', false)
  }
}

/** Werewolf vote */
const sendWerewolfVote = (targetId: PlayerID | null) => {
  gameStore.setActionLoading('werewolf_vote', true)
  
  const event: Event<{ targetId: PlayerID | null }> = {
    channel: EventChannelGameEvent,
    type: EventTypeWerewolfVote,
    data: { targetId }
  }
  
  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error('Erreur envoi werewolf_vote:', e)
    gameStore.setActionLoading('werewolf_vote', false)
  }
}

/** Witch action */
const sendWitchAction = (healTargetId: PlayerID | undefined, poisonTargetId: PlayerID | undefined) => {
  gameStore.setActionLoading('witch_action', true)
  
  const event: Event<{ healTargetId?: PlayerID; poisonTargetId?: PlayerID }> = {
    channel: EventChannelGameEvent,
    type: EventTypeWitchAction,
    data: { healTargetId, poisonTargetId }
  }
  
  try {
    send(JSON.stringify(event))
  } catch (e) {
    console.error('Erreur envoi witch_action:', e)
    gameStore.setActionLoading('witch_action', false)
  }
}

// ========================
// NEW: ACTION SYSTEM HANDLERS
// ========================

/** Send action response (NEW action system) */
const handleActionSubmit = (actionId: string, response: ActionResponse) => {
  console.log('[GameView] Submitting action response:', actionId, response)
  
  const event: Event<{ actionId: string; response: ActionResponse }> = {
    channel: EventChannelAction,
    type: 'action_response' as any,
    data: { actionId, response }
  }
  
  try {
    send(JSON.stringify(event))
    // Mark action as completed locally
    gameStore.markActionCompleted(actionId, response)
  } catch (e) {
    console.error('Erreur envoi action_response:', e)
    notificationStore.showError('Erreur lors de l\'envoi de votre action')
  }
}

/** Close action modal */
const handleActionModalClose = () => {
  // User can close the modal, but action remains active until timeout/response
  console.log('[GameView] Action modal closed by user')
}

// ========================
// MESSAGE DISPATCHER
// ========================

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
      case EventTypeDay:
        gameStore.handleDayEvent(event.data as DayEventData)
        // Announce deaths from recentDeaths (collected via DeathEvent)
        const deaths = gameStore.recentDeaths
        if (deaths.length > 0) {
          const deathMessages = deaths.map(d => {
            const player = gameStore.players.find(p => p.id === d.victim)
            const roleName = ROLE_CONFIG[d.role]?.name || d.role
            return `${player?.username || 'Inconnu'} (${roleName})`
          })
          pushLocalMessage('system', `Cette nuit: ${deathMessages.join(', ')}`, 'village', 'SYSTÈME', true)
        } else {
          pushLocalMessage('system', 'Personne n\'est mort cette nuit !', 'village', 'SYSTÈME', true)
        }
        // Clear deaths after announcement
        gameStore.clearRecentDeaths()
        break
      case EventTypeNight:
        gameStore.handleNightEvent()
        pushLocalMessage('system', 'La nuit tombe sur le village...', 'village', 'SYSTÈME', true)
        break
      case EventTypeVote:
        gameStore.handleVoteEvent(event.data as VoteEventData)
        break
      case EventTypeDeath:
        gameStore.handleDeathEvent(event.data as DeathEventData)
        break
      case EventTypeWin:
        gameStore.handleWinEvent(event.data as WinEventData)
        const winInfo = event.data as WinEventData
        pushLocalMessage('system', `La partie est terminée ! Les ${winInfo.winningClan} ont gagné !`, 'village', 'SYSTÈME', true)
        break
      case EventTypeRoleReveal:
        gameStore.handleRoleReveal(event.data as RoleRevealEventData)
        const roleData = event.data as RoleRevealEventData
        pushLocalMessage('system', `Votre rôle est : ${roleData.role}`, 'village', 'SYSTÈME', true)
        break
      case EventTypeSeerReveal:
        gameStore.handleSeerReveal(event.data as SeerRevealEventData)
        break
      case EventTypeTurn:
        console.log('[GameView] Turn event received from WS:', event.data)
        gameStore.handleTurnEvent(event.data as TurnEventData)
        break
      case EventTypeError:
        const errorData = event.data as ErrorEventData
        gameStore.handleErrorEvent(errorData)
        notificationStore.showError(getErrorMessage(errorData.code))
        break
      case EventTypeAck:
        const ackData = event.data as AckEventData
        gameStore.handleAckEvent(ackData)
        if (ackData.message) {
          notificationStore.showSuccess(ackData.message)
        }
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
  } else if (event.channel === EventChannelTimer) {
    switch (event.type) {
      case EventTypeTimer:
        gameStore.handleTimerEvent(event.data as TimerEventData)
        break
      default:
        console.log("Event Timer non géré:", event.type, event.data)
    }
  } else if (event.channel === EventChannelAction) {
    // NEW: Action system events
    switch (event.type) {
      case EventTypeActionCreated:
        gameStore.handleActionCreated(event.data as ActionCreatedEventData)
        break
      case EventTypeActionExpired:
        gameStore.handleActionExpired(event.data as ActionExpiredEventData)
        notificationStore.showWarning('Le temps imparti pour votre action est écoulé')
        break
      default:
        console.log("Event Action non géré:", event.type, event.data)
    }
  } else if (event.channel === EventChannelConnexion) {
    switch (event.type) {
      case EventTypeGameHostChange:
        gameStore.handleHostChange(event.data as HostChangeEventData)
        const hostData = event.data as HostChangeEventData
        const hostPlayer = gameStore.players.find(p => p.id === hostData.host)
        pushLocalMessage('system', `${hostPlayer?.username || 'Un joueur'} est maintenant l'hôte.`, 'village', 'SYSTÈME', true)
        break
      case EventTypeConnection:
        // Player connected - refresh game data to update connection states
        handleGameData(gameStore.game!)
        const connData = event.data as ConnectionEvent
        const connPlayer = gameStore.players.find(p => p.id === connData.player)
        pushLocalMessage('system', `${connPlayer?.username || 'Un joueur'} s'est connecté.`, 'village', 'SYSTÈME', true)
        break
      case EventTypeDisconnection:
        handleGameData(gameStore.game!)
        const discData = event.data as DisconnectionEvent
        const discPlayer = gameStore.players.find(p => p.id === discData.player)
        pushLocalMessage('system', `${discPlayer?.username || 'Un joueur'} s'est déconnecté.`, 'village', 'SYSTÈME', true)
        break
      case EventTypeReconnection:
        handleGameData(gameStore.game!)
        const reconData = event.data as ReconnectionEventData
        const reconPlayer = gameStore.players.find(p => p.id === reconData.player)
        pushLocalMessage('system', `${reconPlayer?.username || 'Un joueur'} s'est reconnecté.`, 'village', 'SYSTÈME', true)
        break
      case EventTypeInactive:
        handleGameData(gameStore.game!)
        const inactData = event.data as InactiveEventData
        const inactPlayer = gameStore.players.find(p => p.id === inactData.player)
        pushLocalMessage('system', `${inactPlayer?.username || 'Un joueur'} est maintenant inactif.`, 'village', 'SYSTÈME', true)
        break
      default:
        console.log("Event Connexion non géré:", event.type, event.data)
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

const handleLeaveGame = () => {
  if (confirm('Êtes-vous sûr de vouloir quitter cette partie ?')) {
    // Close WebSocket connection
    close(1000, 'Player left game')
    // Reset store
    gameStore.resetStore()
    // Navigate to play view
    router.push('/play')
  }
}

const copyGameCode = async () => {
  try {
    await navigator.clipboard.writeText(gameID)
    codeCopied.value = true
    pushLocalMessage('system', 'Code de la partie copié dans le presse-papier !', 'village', 'SYSTÈME', true)
    setTimeout(() => {
      codeCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy game code:', err)
    pushLocalMessage('system', 'Impossible de copier le code.', 'village', 'SYSTÈME', true)
  }
}

// ========================
// WIN MODAL HANDLERS
// ========================

const handleWinModalClose = () => {
  // Just clear the win data to hide the modal
  // The game state will remain for players to see the results
}

const handlePlayAgain = () => {
  // Close current game connection
  close(1000, 'Starting new game')
  // Reset store
  gameStore.resetStore()
  // Navigate to play view to create a new game
  router.push('/play')
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

    // Stocker l'ID utilisateur dans le store
    gameStore.setCurrentUserId(user.profile.sub || '')

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
  // Reset store (also stops timer tick interval)
  gameStore.resetStore()
})
</script>

<template>
  <div class="shamus-wrapper flex min-h-screen w-full flex-col items-center justify-center p-2 md:p-4 font-['VT323']">

    <!-- HEADER -->
    <header class="mb-4 flex w-full max-w-4xl items-center justify-between px-2">
      <div class="flex items-center gap-3">
        <h1 class="text-3xl text-white drop-shadow-md">SHAMUS <span class="text-purple-400 text-xl">Ingame</span></h1>
        
        <!-- Copy game code button -->
        <button 
          @click="copyGameCode" 
          :title="codeCopied ? 'Code copié !' : 'Copier le code de la partie'"
          class="flex items-center gap-1 px-3 py-1 text-sm bg-purple-900/50 border border-purple-700 hover:bg-purple-800/50 transition-colors rounded"
          :class="{ 'bg-green-900/50 border-green-700': codeCopied }"
        >
          <svg v-if="!codeCopied" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-gray-300">{{ codeCopied ? 'Copié !' : gameID.substring(0, 8) + '...' }}</span>
        </button>
      </div>
      
      <!-- Timer Display (replaces static badge when game is active) -->
      <TimerDisplay v-if="isStarted" />
      <div v-else class="pixel-badge bg-red-900 text-red-200 px-3 py-1 text-lg">{{ currentPhaseText }}</div>
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
                v-for="chan in ['village', 'werewolf', 'lovers'] as const" 
                :key="chan"
                @click="availableChannels.includes(chan) && (currentChatChannel = chan)"
                :disabled="!availableChannels.includes(chan)"
                class="px-4 py-1 text-xl border-t-2 border-x-2 rounded-t-sm transition-all capitalize relative"
                :class="{
                  'border-[#584c75] bg-[#2d2640] text-blue-200': currentChatChannel === chan && chan === 'village' && availableChannels.includes(chan),
                  'border-[#991b1b] bg-[#3a0b0b] text-red-300': currentChatChannel === chan && chan === 'werewolf' && availableChannels.includes(chan),
                  'border-[#d946ef] bg-[#381035] text-pink-300': currentChatChannel === chan && chan === 'lovers' && availableChannels.includes(chan),
                  'border-transparent text-gray-500': currentChatChannel !== chan && availableChannels.includes(chan),
                  'opacity-40 cursor-not-allowed border-transparent text-gray-600': !availableChannels.includes(chan)
                }"
            >
              <span class="flex items-center gap-2">
                {{ chan }}
                <!-- Read-only indicator for village at night -->
                <span 
                  v-if="chan === 'village' && currentChatChannel === chan && !canSendToCurrentChannel" 
                  class="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded"
                >
                  👁️ lecture
                </span>
              </span>
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
                  'text-red-500': msg.channel === 'werewolf',
                  'text-pink-400': msg.channel === 'lovers'
                }">{{ msg.nickname }}:</span>
                <span class="text-xl text-gray-200 break-words">{{ msg.message }}</span>
              </div>
            </div>
          </div>

          <!-- Vote Panel (shown during vote phase) -->
          <VotePanel 
            v-if="isVotePhase && voteState.active"
            @vote="sendVillageVote"
            class="mt-2"
          />

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
              <div class="flex items-center gap-2">
                <!-- Connection status indicator -->
                <div 
                  class="w-3 h-3 rounded-full"
                  :class="{
                    'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]': player.connection_state === 'connected',
                    'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]': player.connection_state === 'disconnected',
                    'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]': player.connection_state === 'inactive'
                  }"
                  :title="player.connection_state === 'connected' ? 'Connecté' : player.connection_state === 'disconnected' ? 'Déconnecté' : 'Inactif'"
                ></div>
                <span class="text-xl text-white">{{ player.username }}</span>
              </div>
              <span class="text-green-500">Vivant</span>
            </div>
          </div>

          <!-- Morts -->
          <h2 class="text-2xl text-red-400 mb-4 border-b border-red-900 pb-2 mt-8">
            Cimetière ({{ deadPlayers.length }})
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="player in deadPlayers" :key="player.id" class="bg-[#150a1a] p-3 border-2 border-[#2a1d3a] flex justify-between items-center opacity-70">
              <div class="flex items-center gap-2">
                <!-- Connection status indicator for dead players -->
                <div 
                  class="w-3 h-3 rounded-full"
                  :class="{
                    'bg-green-500/50': player.connection_state === 'connected',
                    'bg-orange-500/50': player.connection_state === 'disconnected',
                    'bg-red-500/50': player.connection_state === 'inactive'
                  }"
                  :title="player.connection_state === 'connected' ? 'Connecté' : player.connection_state === 'disconnected' ? 'Déconnecté' : 'Inactif'"
                ></div>
                <span class="text-gray-400 line-through">{{ player.username }}</span>
                <span 
                  v-if="player.role" 
                  class="text-sm font-bold"
                  :class="{
                    'text-blue-400': player.role === 'villager',
                    'text-red-500': player.role === 'werewolf',
                    'text-purple-400': player.role === 'seer',
                    'text-green-400': player.role === 'witch'
                  }"
                >
                  {{ ROLE_CONFIG[player.role]?.name || player.role }}
                </span>
              </div>
              <span class="text-red-700 text-sm">Mort</span>
            </div>
          </div>
        </div>

        <!-- TAB: PARAMÈTRES -->
        <div v-else-if="currentMainTab === 'settings'" class="h-full flex flex-col gap-6 p-4 overflow-y-auto">
          
          <!-- Start Game Button (host only, waiting phase) -->
          <StartGameButton 
            v-if="isWaiting"
            @start-game="sendStartGame"
          />

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

            <!-- Game limits info -->
            <div class="text-sm text-gray-400 bg-[#1a1025] p-3 border-l-2 border-purple-700">
              <p>Limites de jeu : {{ MIN_PLAYERS }}-{{ MAX_PLAYERS }} joueurs</p>
              <p class="mt-1">Voyante et Sorcière : maximum 1 de chaque</p>
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

          <!-- My Role Display (when game started) -->
          <div v-if="isStarted && myRole" class="my-role-section p-4 bg-gradient-to-r from-purple-900/50 to-purple-800/30 border border-purple-700 rounded-lg">
            <h3 class="text-xl text-purple-300 mb-2">Votre Rôle</h3>
            <p v-if="!streamerMode" class="text-3xl font-bold" :class="{
              'text-blue-400': myRole === 'villager',
              'text-red-500': myRole === 'werewolf',
              'text-purple-400': myRole === 'seer',
              'text-green-400': myRole === 'witch'
            }">
              {{ ROLE_CONFIG[myRole]?.name || myRole }}
            </p>
            <p v-else class="text-3xl font-bold text-gray-500 blur-sm select-none">
              ████████
            </p>
          </div>
          
          <!-- Section: Options locales -->
          <div class="flex items-center gap-4 cursor-pointer select-none" @click="toggleStreamerMode">
            <div class="w-6 h-6 border-2 border-white flex items-center justify-center">
              <div v-if="streamerMode" class="w-3 h-3 bg-white"></div>
            </div>
            <span class="text-2xl text-gray-300">Mode Streamer (Cacher rôles)</span>
          </div>

          <div class="mt-auto space-y-3">
            <button @click="reconnect()" class="btn-pixel-secondary px-6 py-2 text-xl w-full" :disabled="connectionStatus === 'connecting'">
              {{ connectionStatus === 'connecting' ? 'Connexion...' : 'Forcer la reconnexion' }}
            </button>
            
            <button @click="handleLeaveGame" class="px-6 py-2 text-xl w-full bg-red-900 border-2 border-red-700 text-red-200 hover:bg-red-800 transition-colors">
              Quitter la partie
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- NIGHT ACTION MODAL (OLD SYSTEM - Will be replaced by ActionModal) -->
    <NightActionModal 
      :streamer-mode="streamerMode"
      @seer-action="sendSeerAction"
      @werewolf-vote="sendWerewolfVote"
      @witch-action="sendWitchAction"
    />

    <!-- ACTION MODAL (NEW SYSTEM) -->
    <ActionModal
      :action="currentAction"
      :game-data="game"
      :visible="hasActiveAction"
      @submit="handleActionSubmit"
      @close="handleActionModalClose"
    />

    <!-- WIN MODAL -->
    <WinModal 
      @close="handleWinModalClose"
      @play-again="handlePlayAgain"
    />

    <!-- TOAST NOTIFICATIONS -->
    <ToastNotification />
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
