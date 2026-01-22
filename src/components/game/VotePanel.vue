<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'
import type { PlayerID } from '@/types/player'
import type { PlayersDetailsData } from '@/types/events'

const emit = defineEmits<{
    (e: 'vote', targetId: PlayerID | null): void
}>()

const gameStore = useGameStore()
const { 
    voteState, 
    livingPlayers, 
    currentUserId, 
    voteCounts,
    isAlive,
    isVotePhase 
} = storeToRefs(gameStore)

// Can player vote?
const canVote = computed(() => isVotePhase.value && isAlive.value && voteState.value.active)

// Has player already voted?
const hasVoted = computed(() => voteState.value.myVote !== undefined && voteState.value.myVote !== null)

// My current vote target
const myVoteTarget = computed(() => voteState.value.myVote)

// Get vote count for a player
function getVoteCount(playerId: PlayerID): number {
    return voteCounts.value[playerId] || 0
}

// Get voters for a player
function getVoters(playerId: PlayerID): string[] {
    const voters: string[] = []
    for (const [voterId, targetId] of Object.entries(voteState.value.votes)) {
        if (targetId === playerId) {
            // Find voter's username
            const voter = livingPlayers.value.find(p => p.id === voterId)
            if (voter) {
                voters.push(voter.username)
            }
        }
    }
    return voters
}

// Check if player is the current vote leader
function isLeader(playerId: PlayerID): boolean {
    const count = getVoteCount(playerId)
    if (count === 0) return false
    const maxVotes = Math.max(...Object.values(voteCounts.value), 0)
    return count === maxVotes && count > 0
}

// Handle vote click
function handleVote(player: PlayersDetailsData) {
    if (!canVote.value) return
    
    // If clicking on already voted target, consider it as changing vote
    // The backend handles vote changes
    emit('vote', player.id)
}

// Handle abstain
function handleAbstain() {
    if (!canVote.value) return
    emit('vote', null)
}
</script>

<template>
    <div v-if="voteState.active" class="vote-panel space-y-4">
        <!-- Header -->
        <div class="vote-header flex items-center justify-between border-b border-red-900 pb-3">
            <h2 class="text-2xl text-red-400 font-bold uppercase tracking-wide flex items-center gap-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Vote du Village
            </h2>
            <span v-if="hasVoted" class="text-sm text-green-400 flex items-center gap-1">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Vote enregistré
            </span>
        </div>

        <!-- Instructions -->
        <p v-if="canVote && !hasVoted" class="text-gray-400 text-sm">
            Cliquez sur un joueur pour voter contre lui, ou abstenez-vous.
        </p>
        <p v-else-if="!isAlive" class="text-gray-500 text-sm italic">
            Les morts ne peuvent pas voter.
        </p>

        <!-- Player cards grid -->
        <div class="vote-grid grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
                v-for="player in livingPlayers"
                :key="player.id"
                @click="handleVote(player)"
                :disabled="!canVote || player.id === currentUserId"
                class="player-card relative p-4 border-2 rounded-lg transition-all duration-200 text-left"
                :class="{
                    // My vote target
                    'border-red-500 bg-red-900/40 ring-2 ring-red-500/50': myVoteTarget === player.id,
                    // Vote leader (most votes)
                    'border-yellow-500 bg-yellow-900/20': isLeader(player.id) && myVoteTarget !== player.id,
                    // Default state
                    'border-[#584c75] bg-[#1e1b29] hover:bg-[#2a2540] hover:border-purple-500': !isLeader(player.id) && myVoteTarget !== player.id && canVote && player.id !== currentUserId,
                    // Disabled (me or can't vote)
                    'border-gray-700 bg-gray-900/30 cursor-not-allowed opacity-60': !canVote || player.id === currentUserId
                }"
            >
                <!-- Player name -->
                <div class="font-bold text-lg text-white truncate">
                    {{ player.username }}
                    <span v-if="player.id === currentUserId" class="text-xs text-gray-500">(vous)</span>
                </div>

                <!-- Vote count badge -->
                <div 
                    v-if="getVoteCount(player.id) > 0"
                    class="vote-count absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                    :class="{
                        'bg-yellow-500 text-yellow-900': isLeader(player.id),
                        'bg-red-700 text-white': !isLeader(player.id)
                    }"
                >
                    {{ getVoteCount(player.id) }}
                </div>

                <!-- Voters list -->
                <div v-if="getVoters(player.id).length > 0" class="voters mt-2 text-xs text-gray-400">
                    <span class="text-gray-500">Votes:</span>
                    {{ getVoters(player.id).join(', ') }}
                </div>

                <!-- Selected indicator -->
                <div 
                    v-if="myVoteTarget === player.id" 
                    class="absolute top-2 right-2"
                >
                    <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                    </svg>
                </div>
            </button>
        </div>

        <!-- Abstain button -->
        <div class="abstain-section pt-4 border-t border-gray-700">
            <button
                @click="handleAbstain"
                :disabled="!canVote"
                class="abstain-button w-full py-3 text-lg border-2 rounded transition-all duration-200"
                :class="{
                    'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white': canVote && myVoteTarget !== null,
                    'border-blue-600 bg-blue-900/40 text-blue-300': myVoteTarget === null && hasVoted,
                    'border-gray-700 bg-gray-900 text-gray-600 cursor-not-allowed': !canVote
                }"
            >
                <span class="flex items-center justify-center gap-2">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    S'abstenir
                    <span v-if="myVoteTarget === null && hasVoted" class="text-xs">(vote actuel)</span>
                </span>
            </button>
        </div>

        <!-- Vote result announcement -->
        <div 
            v-if="voteState.result !== undefined && !voteState.active"
            class="vote-result p-4 bg-red-900/40 border border-red-700 rounded-lg text-center"
        >
            <p v-if="voteState.result" class="text-xl text-red-300">
                <span class="font-bold">{{ livingPlayers.find(p => p.id === voteState.result)?.username || 'Quelqu\'un' }}</span>
                a été éliminé par le village !
            </p>
            <p v-else class="text-xl text-gray-400">
                Aucune élimination - égalité des votes.
            </p>
        </div>
    </div>
</template>

<style scoped>
.player-card {
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.player-card:not(:disabled):hover {
    transform: translateY(-2px);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
}

.player-card:not(:disabled):active {
    transform: translateY(0);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
}

.vote-count {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    animation: pop-in 0.2s ease-out;
}

@keyframes pop-in {
    0% {
        transform: scale(0);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
    }
}
</style>
