<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type { Clan } from '@/types/events'
import PixelModal from '@/components/ui/PixelModal.vue'
import PixelButton from '@/components/ui/PixelButton.vue'

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'play-again'): void
}>()

const gameStore = useGameStore()
const { winData, players } = storeToRefs(gameStore)

// Modal visibility
const showModal = computed(() => winData.value !== null)

// Clan display configuration
const clanConfig: Record<Clan, { name: string; titleText: string; variant: 'default' | 'danger' | 'success' | 'warning' | 'purple' | 'blue' | 'green' | 'pink' }> = {
    villager: {
        name: 'Village',
        titleText: 'Le Village a gagne !',
        variant: 'blue',
    },
    werewolf: {
        name: 'Loups-Garous',
        titleText: 'Les Loups ont gagne !',
        variant: 'danger',
    },
    lovers: {
        name: 'Amoureux',
        titleText: 'Les Amoureux ont gagne !',
        variant: 'pink',
    },
    none: {
        name: 'Personne',
        titleText: 'Match Nul !',
        variant: 'default',
    }
}

// Current winning clan config
const currentClanConfig = computed(() => {
    if (!winData.value) return clanConfig.villager
    return clanConfig[winData.value.winningClan] || clanConfig.villager
})

// Is it a draw?
const isDraw = computed(() => winData.value?.winningClan === 'none')

// Get winner player details
const winnerPlayers = computed(() => {
    if (!winData.value) return []
    return winData.value.winners.map(winnerId => {
        const player = players.value.find(p => p.id === winnerId)
        return {
            id: winnerId,
            username: player?.username || 'Inconnu',
            role: player?.role || null
        }
    })
})

// Get role display name
function getRoleName(role: string | null | undefined): string {
    if (!role) return 'Inconnu'
    switch (role) {
        case 'villager': return 'Villageois'
        case 'werewolf': return 'Loup-Garou'
        case 'seer': return 'Voyante'
        case 'witch': return 'Sorciere'
        default: return role
    }
}

// Get role color class
function getRoleColor(role: string | null | undefined): string {
    if (!role) return 'text-gray-400'
    switch (role) {
        case 'villager': return 'text-blue-400'
        case 'werewolf': return 'text-red-400'
        case 'seer': return 'text-purple-400'
        case 'witch': return 'text-green-400'
        default: return 'text-gray-400'
    }
}

// All players with their roles revealed
const allPlayersRevealed = computed(() => {
    return players.value.map(player => ({
        ...player,
        roleName: getRoleName(player.role),
        roleColor: getRoleColor(player.role),
        isWinner: winData.value?.winners.includes(player.id) ?? false
    }))
})

function handleClose() {
    emit('close')
}

function handlePlayAgain() {
    emit('play-again')
}
</script>

<template>
    <PixelModal 
        :visible="showModal" 
        title="FIN_PARTIE.EXE"
        :variant="currentClanConfig.variant"
        size="lg"
        :closable="true"
        @close="handleClose"
    >
        <!-- Victory/Draw announcement -->
        <div class="text-center mb-6">
            <h2 
                class="text-4xl font-bold uppercase tracking-wider mb-2"
                :class="{
                    'text-blue-400': winData?.winningClan === 'villager',
                    'text-red-400': winData?.winningClan === 'werewolf',
                    'text-pink-400': winData?.winningClan === 'lovers',
                    'text-gray-400': winData?.winningClan === 'none'
                }"
            >
                {{ isDraw ? 'Match Nul !' : 'Victoire !' }}
            </h2>
            <p class="text-2xl text-white">
                {{ currentClanConfig.titleText }}
            </p>
        </div>

        <!-- Winners list (only if not a draw) -->
        <div v-if="!isDraw && winnerPlayers.length > 0" class="winners-section mb-6">
            <h3 class="text-xl text-gray-300 mb-3 uppercase tracking-wider border-b-2 border-[#584c75] pb-2">
                Gagnants
            </h3>
            <div class="flex flex-wrap gap-2">
                <div 
                    v-for="winner in winnerPlayers" 
                    :key="winner.id"
                    class="winner-badge pixel-inset px-4 py-2 bg-[#0f0518] flex items-center gap-2"
                >
                    <span class="text-xl font-bold text-white">{{ winner.username }}</span>
                    <span class="text-lg" :class="getRoleColor(winner.role)">
                        ({{ getRoleName(winner.role) }})
                    </span>
                </div>
            </div>
        </div>

        <!-- All players revealed -->
        <div class="reveal-section">
            <h3 class="text-xl text-gray-300 mb-3 uppercase tracking-wider border-b-2 border-[#584c75] pb-2">
                Roles reveles
            </h3>
            <div class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                <div 
                    v-for="player in allPlayersRevealed" 
                    :key="player.id"
                    class="player-reveal pixel-inset p-3 transition-colors"
                    :class="[
                        player.isWinner ? 'bg-yellow-900/30' : 'bg-[#0f0518]',
                        !player.alive ? 'opacity-60' : ''
                    ]"
                >
                    <div class="flex items-center justify-between">
                        <span 
                            class="font-bold text-lg"
                            :class="player.isWinner ? 'text-yellow-300' : 'text-white'"
                        >
                            {{ player.username }}
                        </span>
                        <span :class="player.roleColor" class="text-lg">
                            {{ player.roleName }}
                        </span>
                    </div>
                    <div v-if="!player.alive" class="text-sm text-gray-500 mt-1">
                        Elimine
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-4 justify-center">
                <PixelButton
                    @click="handleClose"
                    variant="secondary"
                >
                    Fermer
                </PixelButton>
                <PixelButton
                    @click="handlePlayAgain"
                    variant="primary"
                >
                    Rejouer
                </PixelButton>
            </div>
        </template>
    </PixelModal>
</template>

<style scoped>
/* Pixel inset style */
.pixel-inset {
    border-top: 2px solid #08020d;
    border-left: 2px solid #08020d;
    border-right: 2px solid #584c75;
    border-bottom: 2px solid #584c75;
}

.winner-badge {
    animation: slide-in 0.3s ease-out;
    animation-fill-mode: both;
}

.winner-badge:nth-child(1) { animation-delay: 0.1s; }
.winner-badge:nth-child(2) { animation-delay: 0.15s; }
.winner-badge:nth-child(3) { animation-delay: 0.2s; }
.winner-badge:nth-child(4) { animation-delay: 0.25s; }
.winner-badge:nth-child(5) { animation-delay: 0.3s; }

@keyframes slide-in {
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Scrollbar styling */
.reveal-section ::-webkit-scrollbar {
    width: 8px;
    background: #0f0518;
}

.reveal-section ::-webkit-scrollbar-thumb {
    background: #584c75;
    border: 2px solid #0f0518;
}

.reveal-section ::-webkit-scrollbar-thumb:hover {
    background: #7c3aed;
}
</style>
