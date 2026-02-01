<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type { PlayerID } from '@/types/player'
import type { PlayersDetailsData } from '@/types/events'
import PixelModal from '@/components/ui/PixelModal.vue'
import PixelButton from '@/components/ui/PixelButton.vue'

// Props
const props = defineProps<{
    streamerMode?: boolean
}>()

// Computed from props
const isStreamerMode = computed(() => props.streamerMode ?? false)

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
    currentUserId,
    lastAck
} = storeToRefs(gameStore)
const { clearNightTurn, clearSeerReveal } = gameStore

// Loading states
const isSeerLoading = computed(() => gameStore.isActionLoading('seer_action'))
const isWerewolfLoading = computed(() => gameStore.isActionLoading('werewolf_vote'))
const isWitchLoading = computed(() => gameStore.isActionLoading('witch_action'))

// Watch for successful ACK to close modal
watch(lastAck, (ack) => {
    if (!ack || !ack.success) return
    
    if (['seer_action', 'werewolf_vote', 'witch_action'].includes(ack.action)) {
        clearNightTurn()
    }
})

// DEBUG: Watch nightTurn changes
watch(nightTurn, (newTurn, oldTurn) => {
    console.log('[NightActionModal] nightTurn changed:', {
        old: oldTurn,
        new: newTurn,
        roleType: newTurn?.roleType,
        targetPlayerId: newTurn?.targetPlayerId,
        canHeal: newTurn?.canHeal,
        canPoison: newTurn?.canPoison
    })
    
    if (newTurn?.roleType === 'witch') {
        console.log('[NightActionModal] WITCH TURN - Details:', {
            targetPlayerId: newTurn.targetPlayerId,
            livingPlayers: livingPlayers.value.map(p => ({ id: p.id, username: p.username })),
            werewolfVictimComputed: werewolfVictim.value
        })
    }
}, { immediate: true, deep: true })

// Modal visibility
const showModal = computed(() => isMyTurn.value || seerReveal.value !== null)

// Title based on role
const modalTitle = computed(() => {
    if (seerReveal.value) return 'REVELATION.EXE'
    if (!nightTurn.value) return ''
    
    switch (nightTurn.value.roleType) {
        case 'seer':
            return 'VOYANTE.EXE'
        case 'werewolf':
            return 'LOUPS.EXE'
        case 'witch':
            return 'SORCIERE.EXE'
        default:
            return 'ACTION.EXE'
    }
})

// Modal variant based on role
const modalVariant = computed(() => {
    if (seerReveal.value) return 'purple'
    if (!nightTurn.value) return 'default'
    
    switch (nightTurn.value.roleType) {
        case 'seer':
            return 'purple'
        case 'werewolf':
            return 'danger'
        case 'witch':
            return 'green'
        default:
            return 'default'
    }
})

// === SEER ACTIONS ===
function handleSeerSelect(player: PlayersDetailsData) {
    emit('seer-action', player.id)
}

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
    console.log('[werewolfVictim] Computing...', {
        targetPlayerId: nightTurn.value?.targetPlayerId,
        hasTargetPlayerId: !!nightTurn.value?.targetPlayerId,
        livingPlayersCount: livingPlayers.value.length
    })
    
    if (!nightTurn.value?.targetPlayerId) {
        console.log('[werewolfVictim] No targetPlayerId, returning null')
        return null
    }
    
    const victim = livingPlayers.value.find(p => p.id === nightTurn.value?.targetPlayerId)
    console.log('[werewolfVictim] Search result:', {
        searchingFor: nightTurn.value.targetPlayerId,
        found: victim,
        allPlayerIds: livingPlayers.value.map(p => p.id)
    })
    
    return victim || null
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

function closeReveal() {
    clearSeerReveal()
}
</script>

<template>
    <PixelModal 
        :visible="showModal" 
        :title="modalTitle"
        :variant="modalVariant"
        :closable="false"
    >
        <!-- SEER REVEAL RESULT -->
        <div v-if="seerReveal" class="seer-reveal text-center space-y-4">
            <p class="text-xl text-gray-300">
                Le role de <span class="font-bold text-white">{{ revealedPlayerName }}</span> est :
            </p>
            <div 
                v-if="!isStreamerMode"
                class="role-reveal text-4xl font-bold py-6 pixel-inset"
                :class="{
                    'bg-red-900/50 text-red-400': seerReveal.roleType === 'werewolf',
                    'bg-blue-900/50 text-blue-400': seerReveal.roleType !== 'werewolf'
                }"
            >
                {{ revealedRoleName }}
            </div>
            <div 
                v-else
                class="role-reveal text-4xl font-bold py-6 pixel-inset bg-gray-900/50 text-gray-500 blur-sm select-none"
            >
                ████████
            </div>
            <PixelButton 
                @click="closeReveal"
                variant="primary"
            >
                Compris
            </PixelButton>
        </div>

        <!-- SEER ACTION -->
        <template v-else-if="nightTurn?.roleType === 'seer'">
            <div v-if="isSeerLoading" class="loading-state text-center py-8">
                <svg class="w-12 h-12 mx-auto animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="mt-4 text-purple-300 text-xl">Consultation en cours...</p>
            </div>
            <template v-else>
                <p class="text-center text-xl text-gray-300 mb-4">
                    Choisissez un joueur pour decouvrir son role :
                </p>
                <div class="grid grid-cols-2 gap-3">
                    <button
                        v-for="player in eligibleTargets"
                        :key="player.id"
                        @click="handleSeerSelect(player)"
                        class="player-btn pixel-inset p-4 text-left bg-purple-900/30 hover:bg-purple-800/50 transition-all duration-200"
                    >
                        <span class="text-xl font-bold text-white">{{ player.username }}</span>
                    </button>
                </div>
            </template>
        </template>

        <!-- WEREWOLF ACTION -->
        <template v-else-if="nightTurn?.roleType === 'werewolf'">
            <div v-if="isWerewolfLoading" class="loading-state text-center py-8">
                <svg class="w-12 h-12 mx-auto animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="mt-4 text-red-300 text-xl">Envoi du vote...</p>
            </div>
            <template v-else>
                <p class="text-center text-xl text-gray-300 mb-4">
                    Choisissez votre victime pour cette nuit :
                </p>
                <div class="grid grid-cols-2 gap-3">
                    <button
                        v-for="player in eligibleTargets"
                        :key="player.id"
                        @click="handleWerewolfSelect(player)"
                        class="player-btn pixel-inset p-4 text-left bg-red-900/30 hover:bg-red-800/50 transition-all duration-200"
                    >
                        <span class="text-xl font-bold text-white">{{ player.username }}</span>
                    </button>
                </div>
                <PixelButton
                    @click="handleWerewolfSkip"
                    variant="secondary"
                    full-width
                    class="mt-4"
                >
                    Ne pas attaquer cette nuit
                </PixelButton>
            </template>
        </template>

        <!-- WITCH ACTION -->
        <template v-else-if="nightTurn?.roleType === 'witch'">
            <div v-if="isWitchLoading" class="loading-state text-center py-8">
                <svg class="w-12 h-12 mx-auto animate-spin text-green-400" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="mt-4 text-green-300 text-xl">Preparation de la potion...</p>
            </div>
            <template v-else>
                <!-- Victim info -->
                <div class="victim-info pixel-inset p-4 bg-[#0f0518] mb-4">
                    <p class="text-gray-400 text-lg mb-1">Victime des loups cette nuit :</p>
                    <p v-if="werewolfVictim" class="text-2xl font-bold text-red-400">
                        {{ werewolfVictim.username }}
                    </p>
                    <p v-else class="text-xl text-gray-500 italic">
                        Personne (les loups n'ont pas attaque)
                    </p>
                </div>

                <!-- Heal option -->
                <div v-if="werewolfVictim" class="heal-section mb-4">
                    <PixelButton
                        v-if="canHeal"
                        @click="handleWitchHeal"
                        variant="success"
                        full-width
                    >
                        Sauver {{ werewolfVictim.username }}
                    </PixelButton>
                    <p v-else class="text-center text-gray-500 italic py-2 text-lg">
                        Potion de soin deja utilisee
                    </p>
                </div>

                <!-- Poison option -->
                <div class="poison-section">
                    <p class="text-gray-400 text-lg mb-2">Empoisonner quelqu'un :</p>
                    <div v-if="canPoison" class="grid grid-cols-2 gap-2">
                        <button
                            v-for="player in livingPlayers.filter(p => p.id !== currentUserId)"
                            :key="player.id"
                            @click="handleWitchPoison(player)"
                            class="player-btn pixel-inset p-3 text-left bg-red-900/20 hover:bg-red-800/40 text-gray-300 transition-all duration-200"
                        >
                            <span class="text-lg">{{ player.username }}</span>
                        </button>
                    </div>
                    <p v-else class="text-center text-gray-500 italic py-2 text-lg">
                        Potion de poison deja utilisee
                    </p>
                </div>

                <!-- Skip button -->
                <PixelButton
                    @click="handleWitchSkip"
                    variant="secondary"
                    full-width
                    class="mt-4"
                >
                    Ne rien faire
                </PixelButton>
            </template>
        </template>
    </PixelModal>
</template>

<style scoped>
/* Pixel inset style for buttons and info boxes */
.pixel-inset {
    border-top: 2px solid #08020d;
    border-left: 2px solid #08020d;
    border-right: 2px solid #584c75;
    border-bottom: 2px solid #584c75;
}

.player-btn {
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.4);
}

.player-btn:hover {
    transform: translateY(-2px);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
}

.player-btn:active {
    transform: translateY(0);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
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
