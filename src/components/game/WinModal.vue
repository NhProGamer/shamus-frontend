<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type { Clan } from '@/types/events'

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'play-again'): void
}>()

const gameStore = useGameStore()
const { winData, players } = storeToRefs(gameStore)

// Modal visibility
const showModal = computed(() => winData.value !== null)

// Clan display configuration
const clanConfig: Record<Clan, { name: string; color: string; bgClass: string; borderClass: string; icon: string }> = {
    villager: {
        name: 'Village',
        color: 'text-blue-400',
        bgClass: 'from-blue-900 to-blue-800',
        borderClass: 'border-blue-500',
        icon: '🏘️'
    },
    werewolf: {
        name: 'Loups-Garous',
        color: 'text-red-400',
        bgClass: 'from-red-900 to-red-800',
        borderClass: 'border-red-500',
        icon: '🐺'
    },
    lovers: {
        name: 'Amoureux',
        color: 'text-pink-400',
        bgClass: 'from-pink-900 to-pink-800',
        borderClass: 'border-pink-500',
        icon: '💕'
    }
}

// Current winning clan config
const currentClanConfig = computed(() => {
    if (!winData.value) return clanConfig.villager
    return clanConfig[winData.value.winningClan] || clanConfig.villager
})

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
    <Teleport to="body">
        <Transition name="modal">
            <div 
                v-if="showModal" 
                class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90"
            >
                <div 
                    class="modal-content w-full max-w-2xl rounded-lg border-4 shadow-2xl overflow-hidden"
                    :class="[currentClanConfig.borderClass, `bg-gradient-to-b ${currentClanConfig.bgClass}`]"
                >
                    <!-- Header with victory announcement -->
                    <div class="modal-header px-6 py-8 border-b border-white/10 text-center">
                        <div class="victory-icon text-6xl mb-4">
                            {{ currentClanConfig.icon }}
                        </div>
                        <h2 class="text-4xl font-bold uppercase tracking-wider mb-2" :class="currentClanConfig.color">
                            Victoire !
                        </h2>
                        <p class="text-2xl text-white">
                            Les <span :class="currentClanConfig.color" class="font-bold">{{ currentClanConfig.name }}</span> ont gagne !
                        </p>
                    </div>

                    <!-- Winners list -->
                    <div class="winners-section px-6 py-4 border-b border-white/10">
                        <h3 class="text-xl text-gray-300 mb-3 uppercase tracking-wider">
                            Gagnants
                        </h3>
                        <div class="flex flex-wrap gap-2">
                            <div 
                                v-for="winner in winnerPlayers" 
                                :key="winner.id"
                                class="winner-badge px-4 py-2 rounded-lg bg-white/10 border border-white/20 flex items-center gap-2"
                            >
                                <span class="text-lg font-bold text-white">{{ winner.username }}</span>
                                <span class="text-sm" :class="getRoleColor(winner.role)">
                                    ({{ getRoleName(winner.role) }})
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- All players revealed -->
                    <div class="reveal-section px-6 py-4 max-h-60 overflow-y-auto">
                        <h3 class="text-xl text-gray-300 mb-3 uppercase tracking-wider">
                            Roles reveles
                        </h3>
                        <div class="grid grid-cols-2 gap-2">
                            <div 
                                v-for="player in allPlayersRevealed" 
                                :key="player.id"
                                class="player-reveal p-3 rounded-lg transition-colors"
                                :class="[
                                    player.isWinner ? 'bg-yellow-900/30 border border-yellow-600' : 'bg-black/20 border border-gray-700',
                                    !player.alive ? 'opacity-60' : ''
                                ]"
                            >
                                <div class="flex items-center justify-between">
                                    <span 
                                        class="font-bold"
                                        :class="player.isWinner ? 'text-yellow-300' : 'text-white'"
                                    >
                                        {{ player.username }}
                                        <span v-if="player.isWinner" class="ml-1">⭐</span>
                                    </span>
                                    <span :class="player.roleColor" class="text-sm">
                                        {{ player.roleName }}
                                    </span>
                                </div>
                                <div v-if="!player.alive" class="text-xs text-gray-500 mt-1">
                                    Elimine
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="modal-footer px-6 py-4 flex gap-4 justify-center border-t border-white/10">
                        <button
                            @click="handleClose"
                            class="px-6 py-3 text-xl border-2 border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                        >
                            Fermer
                        </button>
                        <button
                            @click="handlePlayAgain"
                            class="px-8 py-3 text-xl font-bold border-2 text-white rounded-lg transition-colors"
                            :class="[
                                currentClanConfig.borderClass,
                                `bg-gradient-to-r ${currentClanConfig.bgClass}`,
                                'hover:brightness-110'
                            ]"
                        >
                            Rejouer
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
    transition: all 0.4s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.8) translateY(-30px);
}

.modal-content {
    box-shadow: 0 0 60px rgba(0, 0, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.2);
    animation: victory-glow 1.5s ease-in-out infinite alternate;
}

@keyframes victory-glow {
    from {
        box-shadow: 0 0 60px rgba(0, 0, 0, 0.6), 0 0 80px rgba(255, 215, 0, 0.15);
    }
    to {
        box-shadow: 0 0 60px rgba(0, 0, 0, 0.6), 0 0 140px rgba(255, 215, 0, 0.35);
    }
}

.victory-icon {
    animation: bounce-in 0.6s ease-out;
}

@keyframes bounce-in {
    0% {
        transform: scale(0);
        opacity: 0;
    }
    50% {
        transform: scale(1.3);
    }
    70% {
        transform: scale(0.9);
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
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

.player-reveal {
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

/* Scrollbar styling */
.reveal-section::-webkit-scrollbar {
    width: 8px;
}

.reveal-section::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
}

.reveal-section::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
}

.reveal-section::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
}
</style>
