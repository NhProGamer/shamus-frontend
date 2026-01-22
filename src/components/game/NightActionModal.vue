<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type { PlayerID } from '@/types/player'
import type { PlayersDetailsData } from '@/types/events'

const emit = defineEmits<{
    (e: 'seer-action', targetId: PlayerID): void
    (e: 'werewolf-vote', targetId: PlayerID | null): void
    (e: 'witch-action', healTargetId: PlayerID | undefined, poisonTargetId: PlayerID | undefined): void
}>()

const gameStore = useGameStore()
const { 
    nightTurn, 
    seerReveal,
    isMyTurn,
    eligibleTargets,
    livingPlayers,
    myRole,
    currentUserId,
    lastAck
} = storeToRefs(gameStore)
const { clearNightTurn, clearSeerReveal } = gameStore

// Loading states
const isSeerLoading = computed(() => gameStore.isActionLoading('seer_action'))
const isWerewolfLoading = computed(() => gameStore.isActionLoading('werewolf_vote'))
const isWitchLoading = computed(() => gameStore.isActionLoading('witch_action'))
const isAnyLoading = computed(() => isSeerLoading.value || isWerewolfLoading.value || isWitchLoading.value)

// Watch for successful ACK to close modal
watch(lastAck, (ack) => {
    if (!ack || !ack.success) return
    
    // Close modal when night action is acknowledged
    if (['seer_action', 'werewolf_vote', 'witch_action'].includes(ack.action)) {
        clearNightTurn()
    }
})

// Modal visibility
const showModal = computed(() => isMyTurn.value || seerReveal.value !== null)

// Title based on role
const modalTitle = computed(() => {
    if (seerReveal.value) return 'Revelation'
    if (!nightTurn.value) return ''
    
    switch (nightTurn.value.roleType) {
        case 'seer':
            return 'Tour de la Voyante'
        case 'werewolf':
            return 'Tour des Loups-Garous'
        case 'witch':
            return 'Tour de la Sorciere'
        default:
            return 'Votre Tour'
    }
})

// Role-specific colors
const roleColors = computed(() => {
    const role = nightTurn.value?.roleType || 'villager'
    switch (role) {
        case 'seer':
            return { bg: 'from-purple-900 to-purple-800', border: 'border-purple-500', text: 'text-purple-300' }
        case 'werewolf':
            return { bg: 'from-red-900 to-red-800', border: 'border-red-500', text: 'text-red-300' }
        case 'witch':
            return { bg: 'from-green-900 to-green-800', border: 'border-green-500', text: 'text-green-300' }
        default:
            return { bg: 'from-gray-900 to-gray-800', border: 'border-gray-500', text: 'text-gray-300' }
    }
})

// === SEER ACTIONS ===
function handleSeerSelect(player: PlayersDetailsData) {
    emit('seer-action', player.id)
}

// Get revealed role name
const revealedRoleName = computed(() => {
    if (!seerReveal.value) return ''
    switch (seerReveal.value.roleType) {
        case 'villager': return 'Villageois'
        case 'werewolf': return 'Loup-Garou'
        case 'seer': return 'Voyante'
        case 'witch': return 'Sorciere'
        default: return seerReveal.value.roleType
    }
})

const revealedPlayerName = computed(() => {
    if (!seerReveal.value) return ''
    const player = livingPlayers.value.find(p => p.id === seerReveal.value?.targetId)
    return player?.username || 'Inconnu'
})

// === WEREWOLF ACTIONS ===
function handleWerewolfSelect(player: PlayersDetailsData) {
    emit('werewolf-vote', player.id)
}

function handleWerewolfSkip() {
    emit('werewolf-vote', null)
}

// === WITCH ACTIONS ===
const werewolfVictim = computed(() => {
    if (!nightTurn.value?.targetPlayerId) return null
    return livingPlayers.value.find(p => p.id === nightTurn.value?.targetPlayerId) || null
})

const canHeal = computed(() => nightTurn.value?.canHeal ?? false)
const canPoison = computed(() => nightTurn.value?.canPoison ?? false)

function handleWitchHeal() {
    if (!werewolfVictim.value) return
    emit('witch-action', werewolfVictim.value.id, undefined)
}

function handleWitchPoison(player: PlayersDetailsData) {
    emit('witch-action', undefined, player.id)
}

function handleWitchSkip() {
    emit('witch-action', undefined, undefined)
}

// Close reveal modal
function closeReveal() {
    clearSeerReveal()
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div 
                v-if="showModal" 
                class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            >
                <div 
                    class="modal-content w-full max-w-lg rounded-lg border-4 shadow-2xl overflow-hidden"
                    :class="[roleColors.border, `bg-gradient-to-b ${roleColors.bg}`]"
                >
                    <!-- Header -->
                    <div class="modal-header px-6 py-4 border-b border-white/10">
                        <h2 class="text-3xl font-bold uppercase tracking-wider text-center" :class="roleColors.text">
                            {{ modalTitle }}
                        </h2>
                    </div>

                    <!-- Content -->
                    <div class="modal-body p-6 space-y-4">
                        
                        <!-- SEER REVEAL RESULT -->
                        <div v-if="seerReveal" class="seer-reveal text-center space-y-4">
                            <p class="text-lg text-gray-300">
                                Le role de <span class="font-bold text-white">{{ revealedPlayerName }}</span> est :
                            </p>
                            <div 
                                class="role-reveal text-4xl font-bold py-6 rounded-lg"
                                :class="{
                                    'bg-red-900/50 text-red-400 border-2 border-red-500': seerReveal.roleType === 'werewolf',
                                    'bg-blue-900/50 text-blue-400 border-2 border-blue-500': seerReveal.roleType !== 'werewolf'
                                }"
                            >
                                {{ revealedRoleName }}
                            </div>
                            <button 
                                @click="closeReveal"
                                class="px-8 py-3 text-xl bg-purple-700 hover:bg-purple-600 text-white rounded transition-colors"
                            >
                                Compris
                            </button>
                        </div>

                        <!-- SEER ACTION -->
                        <template v-else-if="nightTurn?.roleType === 'seer'">
                            <!-- Loading state -->
                            <div v-if="isSeerLoading" class="loading-state text-center py-8">
                                <svg class="w-12 h-12 mx-auto animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p class="mt-4 text-purple-300 text-lg">Consultation en cours...</p>
                            </div>
                            <template v-else>
                                <p class="text-center text-gray-300 mb-4">
                                    Choisissez un joueur pour decouvrir son role :
                                </p>
                                <div class="grid grid-cols-2 gap-3">
                                    <button
                                        v-for="player in eligibleTargets"
                                        :key="player.id"
                                        @click="handleSeerSelect(player)"
                                        class="player-btn p-4 text-left border-2 border-purple-700 bg-purple-900/30 hover:bg-purple-800/50 hover:border-purple-500 rounded-lg transition-all duration-200"
                                    >
                                        <span class="text-lg font-bold text-white">{{ player.username }}</span>
                                    </button>
                                </div>
                            </template>
                        </template>

                        <!-- WEREWOLF ACTION -->
                        <template v-else-if="nightTurn?.roleType === 'werewolf'">
                            <!-- Loading state -->
                            <div v-if="isWerewolfLoading" class="loading-state text-center py-8">
                                <svg class="w-12 h-12 mx-auto animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p class="mt-4 text-red-300 text-lg">Envoi du vote...</p>
                            </div>
                            <template v-else>
                                <p class="text-center text-gray-300 mb-4">
                                    Choisissez votre victime pour cette nuit :
                                </p>
                                <div class="grid grid-cols-2 gap-3">
                                    <button
                                        v-for="player in eligibleTargets"
                                        :key="player.id"
                                        @click="handleWerewolfSelect(player)"
                                        class="player-btn p-4 text-left border-2 border-red-700 bg-red-900/30 hover:bg-red-800/50 hover:border-red-500 rounded-lg transition-all duration-200"
                                    >
                                        <span class="text-lg font-bold text-white">{{ player.username }}</span>
                                    </button>
                                </div>
                                <button
                                    @click="handleWerewolfSkip"
                                    class="w-full mt-4 py-3 text-lg border-2 border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                                >
                                    Ne pas attaquer cette nuit
                                </button>
                            </template>
                        </template>

                        <!-- WITCH ACTION -->
                        <template v-else-if="nightTurn?.roleType === 'witch'">
                            <!-- Loading state -->
                            <div v-if="isWitchLoading" class="loading-state text-center py-8">
                                <svg class="w-12 h-12 mx-auto animate-spin text-green-400" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p class="mt-4 text-green-300 text-lg">Preparation de la potion...</p>
                            </div>
                            <template v-else>
                                <!-- Victim info -->
                                <div class="victim-info p-4 bg-black/30 rounded-lg border border-gray-700 mb-4">
                                    <p class="text-gray-400 text-sm mb-1">Victime des loups cette nuit :</p>
                                    <p v-if="werewolfVictim" class="text-xl font-bold text-red-400">
                                        {{ werewolfVictim.username }}
                                    </p>
                                    <p v-else class="text-xl text-gray-500 italic">
                                        Personne (les loups n'ont pas attaque)
                                    </p>
                                </div>

                                <!-- Heal option -->
                                <div v-if="werewolfVictim" class="heal-section mb-4">
                                    <button
                                        v-if="canHeal"
                                        @click="handleWitchHeal"
                                        class="w-full py-4 text-xl border-2 border-green-600 bg-green-900/40 hover:bg-green-800/60 text-green-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                        Sauver {{ werewolfVictim.username }}
                                    </button>
                                    <p v-else class="text-center text-gray-500 italic py-2">
                                        Potion de soin deja utilisee
                                    </p>
                                </div>

                                <!-- Poison option -->
                                <div class="poison-section">
                                    <p class="text-gray-400 text-sm mb-2">Empoisonner quelqu'un :</p>
                                    <div v-if="canPoison" class="grid grid-cols-2 gap-2">
                                        <button
                                            v-for="player in livingPlayers.filter(p => p.id !== currentUserId)"
                                            :key="player.id"
                                            @click="handleWitchPoison(player)"
                                            class="player-btn p-3 text-left border border-red-800 bg-red-900/20 hover:bg-red-800/40 text-gray-300 rounded transition-all duration-200"
                                        >
                                            {{ player.username }}
                                        </button>
                                    </div>
                                    <p v-else class="text-center text-gray-500 italic py-2">
                                        Potion de poison deja utilisee
                                    </p>
                                </div>

                                <!-- Skip button -->
                                <button
                                    @click="handleWitchSkip"
                                    class="w-full mt-4 py-3 text-lg border-2 border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
                                >
                                    Ne rien faire
                                </button>
                            </template>
                        </template>

                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9) translateY(-20px);
}

.modal-content {
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.5), 0 0 100px rgba(128, 0, 255, 0.2);
    animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
    from {
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(128, 0, 255, 0.1);
    }
    to {
        box-shadow: 0 0 40px rgba(0, 0, 0, 0.5), 0 0 100px rgba(128, 0, 255, 0.3);
    }
}

.player-btn {
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.player-btn:hover {
    transform: translateY(-2px);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
}

.player-btn:active {
    transform: translateY(0);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.role-reveal {
    animation: reveal-pulse 0.5s ease-out;
}

@keyframes reveal-pulse {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }
    50% {
        transform: scale(1.05);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
