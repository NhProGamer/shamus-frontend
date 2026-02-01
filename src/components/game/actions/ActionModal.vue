<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import type { ActionState, ActionResponse } from '@/types/actions'
import type { GameDataEventData } from '@/types/events'

// Import action components
import SeerAction from './SeerAction.vue'
import WerewolfAction from './WerewolfAction.vue'
import WitchAction from './WitchAction.vue'
import VillageAction from './VillageAction.vue'

// Import UI components
import PixelModal from '@/components/ui/PixelModal.vue'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  action: ActionState | null
  gameData: GameDataEventData | null
  visible: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [actionId: string, response: ActionResponse]
  close: []
}>()

// ============================================================================
// State
// ============================================================================

const gameStore = useGameStore()

// ============================================================================
// Computed
// ============================================================================

/** Get the current action component based on action type */
const actionComponent = computed(() => {
  if (!props.action) return null

  switch (props.action.type) {
    case 'seer_vision':
      return SeerAction
    case 'werewolf_vote':
      return WerewolfAction
    case 'witch_potion':
      return WitchAction
    case 'village_vote':
      return VillageAction
    default:
      return null
  }
})

/** Get modal title based on action type */
const modalTitle = computed(() => {
  if (!props.action) return 'Action'

  switch (props.action.type) {
    case 'seer_vision':
      return 'Vision de la Voyante'
    case 'werewolf_vote':
      return 'Vote des Loups-Garous'
    case 'witch_potion':
      return 'Potions de la Sorcière'
    case 'village_vote':
      return 'Vote du Village'
    default:
      return 'Action'
  }
})

/** Get modal variant (color) based on action type */
const modalVariant = computed(() => {
  if (!props.action) return 'default'

  switch (props.action.type) {
    case 'seer_vision':
      return 'purple'
    case 'werewolf_vote':
      return 'danger'
    case 'witch_potion':
      return 'purple'
    case 'village_vote':
      return 'blue'
    default:
      return 'default'
  }
})

/** Format remaining time */
const remainingTimeFormatted = computed(() => {
  if (!props.action) return '0:00'

  const seconds = props.action.remainingSeconds
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
})

/** Check if time is running out (< 10 seconds) */
const isTimeRunningOut = computed(() => {
  return props.action && props.action.remainingSeconds < 10
})

// ============================================================================
// Methods
// ============================================================================

function handleSubmit(response: ActionResponse) {
  if (!props.action) return

  console.log('[ActionModal] Submit action response:', props.action.actionId, response)
  
  emit('submit', props.action.actionId, response)
}

function handleCancel() {
  emit('close')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <PixelModal
    :visible="visible"
    :title="modalTitle"
    :variant="modalVariant"
    size="lg"
    :closable="false"
    @close="handleClose"
  >
    <!-- Timer Display -->
    <div 
      v-if="action" 
      :class="[
        'timer-display',
        { 'time-warning': isTimeRunningOut }
      ]"
    >
      <span class="timer-icon">⏱️</span>
      <span class="timer-value">{{ remainingTimeFormatted }}</span>
    </div>

    <!-- Action Component (Dynamic) -->
    <div v-if="action && gameData && actionComponent" class="action-content mt-4">
      <component
        :is="actionComponent"
        :payload="action.payload as any"
        :game-data="gameData"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>

    <!-- No Action / Loading -->
    <div v-else class="no-action">
      <p class="text-center opacity-60">Aucune action en cours</p>
    </div>

    <!-- Note: Action components handle their own buttons (submit/cancel) -->
  </PixelModal>
</template>

