<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const { timer, currentPhase, currentDay } = storeToRefs(gameStore)

// Format time as MM:SS
const formattedTime = computed(() => {
    if (!timer.value) return '--:--'
    const minutes = Math.floor(timer.value.remaining / 60)
    const seconds = timer.value.remaining % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// Progress percentage (0-100)
const progress = computed(() => {
    if (!timer.value || timer.value.duration === 0) return 100
    return (timer.value.remaining / timer.value.duration) * 100
})

// Timer color based on remaining time
const timerColor = computed(() => {
    if (!timer.value) return 'bg-gray-600'
    const percent = progress.value
    if (percent > 50) return 'bg-green-500'
    if (percent > 25) return 'bg-yellow-500'
    return 'bg-red-500'
})

// Background color based on phase
const phaseColor = computed(() => {
    switch (currentPhase.value) {
        case 'day':
            return 'from-amber-900/50 to-amber-800/30'
        case 'night':
            return 'from-indigo-900/50 to-indigo-800/30'
        case 'vote':
            return 'from-red-900/50 to-red-800/30'
        default:
            return 'from-purple-900/50 to-purple-800/30'
    }
})

// Phase text display
const phaseText = computed(() => {
    switch (currentPhase.value) {
        case 'day':
            return `JOUR ${currentDay.value}`
        case 'night':
            return `NUIT ${currentDay.value}`
        case 'vote':
            return 'VOTE'
        default:
            return 'ATTENTE'
    }
})

// Role text when it's a specific role's turn during night
const roleText = computed(() => {
    if (!timer.value?.roleType) return null
    switch (timer.value.roleType) {
        case 'seer':
            return 'Tour de la Voyante'
        case 'werewolf':
            return 'Tour des Loups-Garous'
        case 'witch':
            return 'Tour de la Sorciere'
        default:
            return null
    }
})

// Is timer active
const isActive = computed(() => timer.value?.active ?? false)

// Is timer low (less than 10 seconds)
const isLow = computed(() => (timer.value?.remaining ?? 0) <= 10)
</script>

<template>
    <div 
        v-if="isActive"
        class="timer-display flex items-center gap-3 px-4 py-2 rounded-lg border-2 transition-all duration-300"
        :class="[
            `bg-gradient-to-r ${phaseColor}`,
            'border-[#584c75]',
            { 'animate-pulse': isLow }
        ]"
    >
        <!-- Phase badge -->
        <div class="phase-badge px-3 py-1 text-lg font-bold uppercase tracking-wide"
             :class="{
                 'bg-amber-800 text-amber-200': currentPhase === 'day',
                 'bg-indigo-800 text-indigo-200': currentPhase === 'night',
                 'bg-red-800 text-red-200': currentPhase === 'vote',
                 'bg-purple-800 text-purple-200': currentPhase === 'start'
             }"
        >
            {{ phaseText }}
        </div>

        <!-- Role indicator (night phase) -->
        <div v-if="roleText" class="role-indicator flex items-center gap-2 px-2 py-1 bg-black/30 rounded text-sm font-bold">
            <!-- Icon based on role -->
            <span v-if="timer?.roleType === 'seer'">🔮</span>
            <span v-else-if="timer?.roleType === 'werewolf'">🐺</span>
            <span v-else-if="timer?.roleType === 'witch'">🧪</span>
            <span class="text-white">{{ roleText }}</span>
        </div>

        <!-- Timer display -->
        <div class="timer-value flex items-center gap-2">
            <!-- Progress bar -->
            <div class="progress-bar w-24 h-2 bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                <div 
                    class="h-full transition-all duration-1000 ease-linear"
                    :class="timerColor"
                    :style="{ width: `${progress}%` }"
                ></div>
            </div>

            <!-- Time text -->
            <span 
                class="time-text text-2xl font-mono font-bold tabular-nums"
                :class="{
                    'text-green-400': progress > 50,
                    'text-yellow-400': progress > 25 && progress <= 50,
                    'text-red-400': progress <= 25
                }"
            >
                {{ formattedTime }}
            </span>
        </div>
    </div>

    <!-- Inactive state - just show phase -->
    <div v-else class="phase-only px-3 py-1 text-lg font-bold uppercase tracking-wide bg-purple-900/50 border border-purple-700 rounded">
        {{ phaseText }}
    </div>
</template>

<style scoped>
.timer-display {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.phase-badge {
    border: 2px solid currentColor;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
}

.time-text {
    text-shadow: 0 0 10px currentColor;
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}
</style>
