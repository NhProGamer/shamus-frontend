<script setup lang="ts">
import { ref, computed } from 'vue'
import type { WitchPotionPayload, WitchPotionResponse } from '@/types/actions'
import type { GameDataEventData, PlayersDetailsData } from '@/types/events'
import type { PlayerID } from '@/types/player'

// ============================================================================
// Props & Emits
// ============================================================================

interface Props {
  payload: WitchPotionPayload
  gameData: GameDataEventData
}

const props = defineProps<Props>()

const emit = defineEmits<{
  submit: [response: WitchPotionResponse]
  cancel: []
}>()

// ============================================================================
// State
// ============================================================================

const healTargetId = ref<PlayerID | null>(null)
const poisonTargetId = ref<PlayerID | null>(null)

// ============================================================================
// Computed
// ============================================================================

/** Get victim player details */
const victim = computed((): PlayersDetailsData | null => {
  if (!props.payload.victimId) return null
  return props.gameData.players.find(p => p.id === props.payload.victimId) || null
})

/** Get all living players for poison selection */
const livingPlayers = computed((): PlayersDetailsData[] => {
  return props.gameData.players.filter(p => p.alive)
})

/** Check if can heal */
const canHeal = computed(() => props.payload.hasHealPotion && victim.value !== null)

/** Check if can poison */
const canPoison = computed(() => props.payload.hasPoisonPotion)

/** Check if a player is selected for poison */
const isPoisonSelected = (playerId: PlayerID): boolean => {
  return poisonTargetId.value === playerId
}

/** Can submit (always true, can skip with both null) */
const canSubmit = computed(() => true)

// ============================================================================
// Methods
// ============================================================================

function selectHeal() {
  if (!canHeal.value || !victim.value) return
  healTargetId.value = victim.value.id
  poisonTargetId.value = null // Can't heal AND poison
}

function selectPoison(playerId: PlayerID) {
  poisonTargetId.value = playerId
  healTargetId.value = null // Can't heal AND poison
}

function skip() {
  healTargetId.value = null
  poisonTargetId.value = null
}

function handleSubmit() {
  const response: WitchPotionResponse = {
    healTargetId: healTargetId.value,
    poisonTargetId: poisonTargetId.value
  }

  emit('submit', response)
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <div class="witch-action">
    <!-- Header -->
    <div class="action-header">
      <h3 class="text-lg font-bold mb-2">🧪 Potions de la Sorcière</h3>
      <p class="text-sm opacity-80">
        Utilisez vos potions avec sagesse
      </p>
    </div>

    <!-- Victim Section (Heal Potion) -->
    <div v-if="victim" class="potion-section heal-section mt-4">
      <h4 class="section-title">💚 Potion de Guérison</h4>
      
      <div v-if="canHeal" class="victim-card">
        <div class="victim-info">
          <span class="victim-name">{{ victim.username }}</span>
          <span class="victim-label">a été attaqué par les loups</span>
        </div>
        <button
          @click="selectHeal"
          :class="[
            'btn-heal',
            { 'active': healTargetId !== null }
          ]"
        >
          <span v-if="healTargetId !== null">✓</span>
          Sauver
        </button>
      </div>

      <div v-else class="potion-used">
        <p class="text-sm opacity-60">Potion de guérison déjà utilisée</p>
      </div>
    </div>

    <div v-else class="no-victim mt-4">
      <p class="text-center text-sm opacity-60">Aucune victime cette nuit</p>
    </div>

    <!-- Poison Section -->
    <div class="potion-section poison-section mt-6">
      <h4 class="section-title">💀 Potion de Poison</h4>

      <div v-if="canPoison">
        <p class="text-sm opacity-80 mb-3">Choisissez un joueur à empoisonner</p>
        
        <div class="targets-grid">
          <button
            v-for="player in livingPlayers"
            :key="player.id"
            @click="selectPoison(player.id)"
            :class="[
              'target-card',
              {
                'selected': isPoisonSelected(player.id),
                'alive': player.alive,
                'dead': !player.alive
              }
            ]"
            :disabled="!player.alive"
          >
            <div class="player-name">{{ player.username }}</div>
            <div v-if="isPoisonSelected(player.id)" class="selected-indicator">✓</div>
          </button>
        </div>
      </div>

      <div v-else class="potion-used">
        <p class="text-sm opacity-60">Potion de poison déjà utilisée</p>
      </div>
    </div>

    <!-- Skip Option -->
    <div class="skip-section mt-4">
      <button
        @click="skip"
        :class="[
          'btn-skip',
          { 'active': healTargetId === null && poisonTargetId === null }
        ]"
      >
        <span v-if="healTargetId === null && poisonTargetId === null">✓</span>
        Ne rien faire
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
        Confirmer
      </button>
    </div>
  </div>
</template>

