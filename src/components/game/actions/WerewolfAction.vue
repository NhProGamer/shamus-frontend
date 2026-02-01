<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WerewolfVotePayload, WerewolfVoteResponse } from '@/types/actions'
import type { GameDataEventData, PlayersDetailsData } from '@/types/events'
import type { PlayerID } from '@/types/player'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  payload: WerewolfVotePayload
  gameData: GameDataEventData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [response: WerewolfVoteResponse]
  cancel: []
}>()

// ============================================================================
// State
// ============================================================================

const selectedTargetId = ref<PlayerID | null>(null)

// ============================================================================
// Computed
// ============================================================================

/** Get player details for eligible targets */
const eligiblePlayers = computed((): PlayersDetailsData[] => {
  const eligibleIds = props.payload.eligibleTargets
  return props.gameData.players.filter(p => eligibleIds.includes(p.id))
})

/** Check if a player is selected */
const isSelected = (playerId: PlayerID): boolean => {
  return selectedTargetId.value === playerId
}

/** Can submit (always true, can abstain with null) */
const canSubmit = computed(() => true)

// ============================================================================
// Methods
// ============================================================================

function selectTarget(playerId: PlayerID) {
  selectedTargetId.value = playerId
}

function abstain() {
  selectedTargetId.value = null
}

function handleSubmit() {
  const response: WerewolfVoteResponse = {
    targetId: selectedTargetId.value
  }

  emit('submit', response)
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="werewolf-action">
    <!-- Header -->
    <div class="action-header">
      <h3 class="text-lg font-bold mb-2">🐺 Vote des Loups-Garous</h3>
      <p class="text-sm opacity-80">
        Choisissez une victime à éliminer cette nuit
      </p>
    </div>

    <!-- Target Selection Grid -->
    <div class="targets-grid mt-4">
      <button
        v-for="player in eligiblePlayers"
        :key="player.id"
        @click="selectTarget(player.id)"
        :class="[
          'target-card',
          {
            'selected': isSelected(player.id),
            'alive': player.alive,
            'dead': !player.alive
          }
        ]"
        :disabled="!player.alive"
      >
        <div class="player-name">{{ player.username }}</div>
        <div v-if="isSelected(player.id)" class="selected-indicator">✓</div>
      </button>
    </div>

    <!-- No eligible targets message -->
    <div v-if="eligiblePlayers.length === 0" class="no-targets">
      <p class="text-center opacity-60">Aucune cible disponible</p>
    </div>

    <!-- Abstain Option -->
    <div class="abstain-section mt-4">
      <button
        @click="abstain"
        :class="[
          'btn-abstain',
          { 'active': selectedTargetId === null }
        ]"
      >
        <span v-if="selectedTargetId === null">✓</span>
        Ne pas attaquer
      </button>
    </div>

    <!-- Action Buttons -->
    <div class="action-buttons mt-6">
      <button
        @click="handleCancel"
        class="btn-cancel"
      >
        Annuler
      </button>
      <button
        @click="handleSubmit"
        :disabled="!canSubmit"
        class="btn-submit"
      >
        Confirmer le vote
      </button>
    </div>
  </div>
</template>

<style scoped>
.werewolf-action {
  @apply p-4;
}

.action-header {
  @apply text-center;
}

.targets-grid {
  @apply grid grid-cols-2 gap-3 max-h-64 overflow-y-auto;
}

.target-card {
  @apply relative px-4 py-3 rounded border-2 transition-all;
  @apply bg-gray-800 border-gray-600 hover:border-red-400;
}

.target-card.selected {
  @apply border-red-500 bg-red-900/30;
}

.target-card.dead {
  @apply opacity-50 cursor-not-allowed;
}

.player-name {
  @apply text-sm font-medium;
}

.selected-indicator {
  @apply absolute top-1 right-1 text-red-400 text-xl;
}

.no-targets {
  @apply py-8;
}

.abstain-section {
  @apply flex justify-center;
}

.btn-abstain {
  @apply px-4 py-2 rounded border-2 border-gray-600 transition-all;
  @apply hover:border-yellow-400 bg-gray-800;
}

.btn-abstain.active {
  @apply border-yellow-500 bg-yellow-900/30;
}

.action-buttons {
  @apply flex gap-3 justify-end;
}

.btn-cancel {
  @apply px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors;
}

.btn-submit {
  @apply px-4 py-2 rounded bg-red-600 hover:bg-red-500 transition-colors;
  @apply disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600;
}
</style>
