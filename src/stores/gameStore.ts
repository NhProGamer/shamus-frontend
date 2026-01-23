import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { PlayerID } from '@/types/player'
import type { RoleType } from '@/types/roles'
import type { GamePhase } from '@/types/game'
import type {
    GameDataEventData,
    TimerEventData,
    TurnEventData,
    VoteEventData,
    DayEventData,
    DeathEventData,
    WinEventData,
    RoleRevealEventData,
    SeerRevealEventData,
    PlayersDetailsData,
    Clan,
    ErrorEventData,
    AckEventData,
    HostChangeEventData,
} from '@/types/events'

// ========================
// GAME STORE
// ========================

export const useGameStore = defineStore('game', () => {
    // ========================
    // STATE
    // ========================

    // Timer interval for client-side countdown (not reactive, just a handle)
    let timerIntervalId: ReturnType<typeof setInterval> | null = null

    // Current user
    const currentUserId = ref<string | null>(null)

    // Game state (from server)
    const game = ref<GameDataEventData | null>(null)

    // Timer state
    const timer = ref<{
        phase: GamePhase
        roleType?: RoleType
        duration: number
        remaining: number
        active: boolean
    } | null>(null)

    // Vote state
    const voteState = ref<{
        active: boolean
        votes: Record<PlayerID, PlayerID | null>  // voter -> target
        myVote: PlayerID | null
        result?: PlayerID | null  // eliminated player
    }>({
        active: false,
        votes: {},
        myVote: null,
    })

    // Night turn state (when it's my turn to act)
    const nightTurn = ref<TurnEventData | null>(null)

    // Seer reveal (result of seer action)
    const seerReveal = ref<SeerRevealEventData | null>(null)

    // Win state (game ended)
    const winData = ref<WinEventData | null>(null)

    // Recent deaths (for announcements) - stores victim ID and their revealed role
    interface DeathInfo {
        victim: PlayerID;
        role: RoleType;
    }
    const recentDeaths = ref<DeathInfo[]>([])

    // My revealed role (assigned at game start)
    const myRole = ref<RoleType | null>(null)

    // Action loading states (tracks pending server responses)
    const actionLoading = ref<Record<string, boolean>>({})

    // Last error received (for UI feedback)
    const lastError = ref<ErrorEventData | null>(null)

    // Last ack received (for UI feedback)
    const lastAck = ref<AckEventData | null>(null)

    // ========================
    // COMPUTED
    // ========================

    const isHost = computed(() => {
        if (!game.value || !currentUserId.value) return false
        return game.value.host === currentUserId.value
    })

    const isWaiting = computed(() => game.value?.status === 'waiting')
    const isStarted = computed(() => game.value?.status === 'active')
    const isEnded = computed(() => game.value?.status === 'ended')

    const currentPhase = computed(() => game.value?.phase ?? 'start')
    const currentDay = computed(() => game.value?.day ?? 0)

    const isDay = computed(() => currentPhase.value === 'day')
    const isNight = computed(() => currentPhase.value === 'night')
    const isVotePhase = computed(() => currentPhase.value === 'vote')

    const players = computed(() => game.value?.players ?? [])
    const livingPlayers = computed(() => players.value.filter(p => p.alive))
    const deadPlayers = computed(() => players.value.filter(p => !p.alive))

    const playerCount = computed(() => players.value.length)
    const totalRoles = computed(() => {
        if (!game.value?.settings?.roles) return 0
        return Object.values(game.value.settings.roles).reduce((sum, count) => sum + count, 0)
    })
    const rolesMatchPlayers = computed(() => totalRoles.value === playerCount.value)

    const currentPlayer = computed((): PlayersDetailsData | undefined => {
        if (!currentUserId.value) return undefined
        return players.value.find(p => p.id === currentUserId.value)
    })

    const isAlive = computed(() => currentPlayer.value?.alive ?? true)

    // Check if it's my turn to act during night
    const isMyTurn = computed(() => {
        if (!nightTurn.value || !myRole.value) return false
        return nightTurn.value.roleType === myRole.value
    })

    // Eligible targets for current action
    const eligibleTargets = computed((): PlayersDetailsData[] => {
        if (!nightTurn.value) return []

        switch (nightTurn.value.roleType) {
            case 'seer':
                // Seer can look at any living player except themselves
                return livingPlayers.value.filter(p => p.id !== currentUserId.value)

            case 'werewolf':
                // Werewolves can attack any living non-werewolf
                return livingPlayers.value.filter(p => p.role !== 'werewolf')

            case 'witch':
                // For heal: only the werewolf victim (if canHeal)
                // For poison: any living player (if canPoison)
                // This is handled in the UI component
                return livingPlayers.value

            default:
                return []
        }
    })

    // Get vote count for each player
    const voteCounts = computed((): Record<PlayerID, number> => {
        const counts: Record<PlayerID, number> = {}
        for (const target of Object.values(voteState.value.votes)) {
            if (target) {
                counts[target] = (counts[target] || 0) + 1
            }
        }
        return counts
    })

    // ========================
    // ACTIONS - Event Handlers
    // ========================

    function setCurrentUserId(userId: string) {
        currentUserId.value = userId
    }

    function handleGameData(data: GameDataEventData) {
        game.value = data
        // Clear win data if game is restarting
        if (data.status === 'waiting') {
            winData.value = null
            myRole.value = null
            resetVote()
        }
    }

    function handleTimerEvent(data: TimerEventData) {
        if (data.status === 'expired' || data.status === 'skipped') {
            stopTimerTick()
            timer.value = null
        } else {
            // Sync with server value
            timer.value = {
                phase: data.phase,
                roleType: data.roleType,
                duration: data.duration,
                remaining: data.remaining,
                active: true,
            }
            // Start/restart client-side countdown
            startTimerTick()
        }
    }

    function handleTurnEvent(data: TurnEventData) {
        nightTurn.value = data
        // Clear any previous seer reveal
        if (data.roleType === 'seer') {
            seerReveal.value = null
        }
    }

    function handleVoteEvent(data: VoteEventData) {
        switch (data.type) {
            case 'start':
                voteState.value = {
                    active: true,
                    votes: {},
                    myVote: null,
                }
                break

            case 'player':
                if (data.player && data.target !== undefined) {
                    voteState.value.votes[data.player] = data.target ?? null
                    // Track my own vote
                    if (data.player === currentUserId.value) {
                        voteState.value.myVote = data.target ?? null
                    }
                }
                break

            case 'end':
                voteState.value.active = false
                voteState.value.result = data.target ?? null
                break
        }
    }

    function handleDayEvent(_data: DayEventData) {
        // DayEvent now only signals day start (day number)
        // Deaths are received via individual DeathEvent before this
        // Note: don't clear recentDeaths here - GameView needs them for announcement
        nightTurn.value = null
    }

    function handleNightEvent() {
        // Reset for new night
        recentDeaths.value = []
        resetVote()
    }

    function handleDeathEvent(data: DeathEventData) {
        // Add death with role for announcement
        // Check if victim already in list to avoid duplicates
        if (!recentDeaths.value.some(d => d.victim === data.victim)) {
            recentDeaths.value.push({
                victim: data.victim,
                role: data.role
            })
        }
    }

    function handleWinEvent(data: WinEventData) {
        winData.value = data
    }

    function handleHostChange(data: HostChangeEventData) {
        if (game.value) {
            game.value = { ...game.value, host: data.host }
        }
    }

    function handleRoleReveal(data: RoleRevealEventData) {
        // My role was revealed to me at game start
        myRole.value = data.role
    }

    function handleSeerReveal(data: SeerRevealEventData) {
        seerReveal.value = data
        // Clear the turn after action completed
        nightTurn.value = null
    }

    // ========================
    // ACTIONS - Error/Ack Handlers
    // ========================

    function handleErrorEvent(data: ErrorEventData) {
        lastError.value = data
        // Clear loading state for the action that failed
        if (data.action) {
            actionLoading.value[data.action] = false
        }
    }

    function handleAckEvent(data: AckEventData) {
        lastAck.value = data
        // Clear loading state for the acknowledged action
        if (data.action) {
            actionLoading.value[data.action] = false
        }
    }

    function setActionLoading(action: string, loading: boolean) {
        actionLoading.value[action] = loading
    }

    function isActionLoading(action: string): boolean {
        return actionLoading.value[action] ?? false
    }

    function clearLastError() {
        lastError.value = null
    }

    function clearLastAck() {
        lastAck.value = null
    }

    // ========================
    // ACTIONS - Timer Tick (Client-side countdown)
    // ========================

    function startTimerTick() {
        // Clear any existing interval first
        stopTimerTick()

        // Start countdown interval (decrement every second)
        timerIntervalId = setInterval(() => {
            if (timer.value && timer.value.remaining > 0) {
                timer.value = {
                    ...timer.value,
                    remaining: timer.value.remaining - 1
                }
            } else {
                // Stop when timer reaches 0
                stopTimerTick()
            }
        }, 1000)
    }

    function stopTimerTick() {
        if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
        }
    }

    // ========================
    // ACTIONS - UI Helpers
    // ========================

    function resetVote() {
        voteState.value = {
            active: false,
            votes: {},
            myVote: null,
        }
    }

    function clearNightTurn() {
        nightTurn.value = null
    }

    function clearSeerReveal() {
        seerReveal.value = null
    }

    function clearRecentDeaths() {
        recentDeaths.value = []
    }

    function resetStore() {
        stopTimerTick()
        currentUserId.value = null
        game.value = null
        timer.value = null
        nightTurn.value = null
        seerReveal.value = null
        winData.value = null
        recentDeaths.value = []
        myRole.value = null
        actionLoading.value = {}
        lastError.value = null
        lastAck.value = null
        resetVote()
    }

    // ========================
    // RETURN
    // ========================

    return {
        // State
        currentUserId,
        game,
        timer,
        voteState,
        nightTurn,
        seerReveal,
        winData,
        recentDeaths,
        myRole,
        actionLoading,
        lastError,
        lastAck,

        // Computed
        isHost,
        isWaiting,
        isStarted,
        isEnded,
        currentPhase,
        currentDay,
        isDay,
        isNight,
        isVotePhase,
        players,
        livingPlayers,
        deadPlayers,
        playerCount,
        totalRoles,
        rolesMatchPlayers,
        currentPlayer,
        isAlive,
        isMyTurn,
        eligibleTargets,
        voteCounts,

        // Actions - Event handlers
        setCurrentUserId,
        handleGameData,
        handleTimerEvent,
        handleTurnEvent,
        handleVoteEvent,
        handleDayEvent,
        handleNightEvent,
        handleDeathEvent,
        handleWinEvent,
        handleHostChange,
        handleRoleReveal,
        handleSeerReveal,
        handleErrorEvent,
        handleAckEvent,

        // Actions - UI helpers
        resetVote,
        clearNightTurn,
        clearSeerReveal,
        clearRecentDeaths,
        resetStore,
        setActionLoading,
        isActionLoading,
        clearLastError,
        clearLastAck,
        stopTimerTick,
    }
})
