<script setup lang="ts">
import { ref, computed } from 'vue'
import type { VillageVotePayload, VillageVoteResponse } from '@/types/actions'
import type { GameDataEventData, PlayersDetailsData } from '@/types/events'
import type { PlayerID } from '@/types/player'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  payload: VillageVotePayload
  gameData: GameDataEventData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [response: VillageVoteResponse]
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
  const response: VillageVoteResponse = {
    targetId: selectedTargetId.value
  }

  emit('submit', response)
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="village-action">
    <!-- Header -->
    <div class="action-header">
      <h3 class="text-lg font-bold mb-2">🗳️ Vote du Village</h3>
      <p class="text-sm opacity-80">
        Votez pour éliminer un joueur suspect
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
        S'abstenir
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

