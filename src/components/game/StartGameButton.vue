<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'

const emit = defineEmits<{
    (e: 'start-game'): void
}>()

const gameStore = useGameStore()
const { isHost, isWaiting, rolesMatchPlayers, playerCount, totalRoles } = storeToRefs(gameStore)

// Can the game be started?
const canStart = computed(() => {
    return isHost.value && isWaiting.value && rolesMatchPlayers.value && playerCount.value >= 4
})

// Validation message
const validationMessage = computed(() => {
    if (!isHost.value) {
        return null // Don't show anything to non-hosts
    }
    
    if (!isWaiting.value) {
        return { type: 'info', text: 'La partie a déjà commencé' }
    }
    
    if (playerCount.value < 4) {
        return { type: 'warning', text: `Minimum 4 joueurs requis (${playerCount.value}/4)` }
    }
    
    if (!rolesMatchPlayers.value) {
        const diff = totalRoles.value - playerCount.value
        if (diff > 0) {
            return { type: 'warning', text: `${diff} rôle(s) en trop` }
        } else {
            return { type: 'warning', text: `${Math.abs(diff)} rôle(s) manquant(s)` }
        }
    }
    
    return { type: 'success', text: 'Prêt à démarrer !' }
})

function handleClick() {
    if (canStart.value) {
        emit('start-game')
    }
}
</script>

<template>
    <div v-if="isHost && isWaiting" class="start-game-section space-y-3">
        <!-- Validation message -->
        <div 
            v-if="validationMessage"
            class="validation-message px-4 py-2 text-sm border-l-4"
            :class="{
                'bg-yellow-900/30 border-yellow-500 text-yellow-300': validationMessage.type === 'warning',
                'bg-green-900/30 border-green-500 text-green-300': validationMessage.type === 'success',
                'bg-blue-900/30 border-blue-500 text-blue-300': validationMessage.type === 'info'
            }"
        >
            {{ validationMessage.text }}
        </div>
        
        <!-- Start button -->
        <button
            @click="handleClick"
            :disabled="!canStart"
            class="start-button w-full py-4 text-2xl font-bold uppercase tracking-widest transition-all duration-200"
            :class="{
                'bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98]': canStart,
                'bg-gray-700 text-gray-500 cursor-not-allowed': !canStart
            }"
        >
            <span class="flex items-center justify-center gap-3">
                <svg v-if="canStart" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Lancer la Partie</span>
            </span>
        </button>
        
        <!-- Player count indicator -->
        <div class="flex items-center justify-center gap-4 text-sm text-gray-400">
            <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {{ playerCount }} joueur(s)
            </span>
            <span class="text-gray-600">|</span>
            <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ totalRoles }} rôle(s)
            </span>
        </div>
    </div>
</template>

<style scoped>
.start-button {
    border: 3px solid;
    border-color: rgba(255,255,255,0.2) rgba(0,0,0,0.3) rgba(0,0,0,0.3) rgba(255,255,255,0.2);
}

.start-button:not(:disabled):hover {
    border-color: rgba(255,255,255,0.3) rgba(0,0,0,0.4) rgba(0,0,0,0.4) rgba(255,255,255,0.3);
}

.start-button:not(:disabled):active {
    border-color: rgba(0,0,0,0.3) rgba(255,255,255,0.2) rgba(255,255,255,0.2) rgba(0,0,0,0.3);
}
</style>
