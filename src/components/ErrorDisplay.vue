<script setup lang="ts">
import { ref, watch } from 'vue'

interface ErrorDisplayProps {
  error: Error | Event | null
  title?: string
  showRetry?: boolean
}

const props = defineProps<ErrorDisplayProps>()
const emit = defineEmits(['retry'])

const showDetails = ref(false)
const errorMessage = ref<string>('')

// Extraire le message d'erreur
const extractErrorMessage = () => {
  if (!props.error) return 'Erreur inconnue'
  
  if (props.error instanceof Error) {
    return props.error.message || 'Erreur inconnue'
  } else if (props.error instanceof Event) {
    if ('detail' in props.error && typeof props.error.detail === 'string') {
      return props.error.detail
    }
    return props.error.type || 'Erreur d\'événement'
  } else {
    return 'Erreur inconnue'
  }
}

// Mettre à jour le message d'erreur lorsque l'erreur change
watch(() => props.error, () => {
  errorMessage.value = extractErrorMessage()
}, { immediate: true })

const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const getErrorDetails = () => {
  if (!props.error) return 'Aucun détail disponible'
  
  if (props.error instanceof Error) {
    return props.error.stack || 'Aucun détail disponible'
  } else if (props.error instanceof Event) {
    return JSON.stringify(props.error, null, 2)
  } else {
    return 'Aucun détail disponible'
  }
}
</script>

<template>
  <div v-if="error" class="error-display bg-red-900/90 text-red-100 p-4 rounded border border-red-700 mb-4">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0">
        <svg class="w-6 h-6 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      </div>
      <div class="flex-grow">
        <h3 class="font-bold text-lg mb-2">
          {{ title || 'Erreur' }}
        </h3>
        <p class="mb-3">
          {{ errorMessage }}
        </p>
        
        <div v-if="showDetails" class="error-details bg-red-800/50 p-3 rounded mt-3 text-sm font-mono whitespace-pre-wrap">
          {{ getErrorDetails() }}
        </div>
        
        <div class="flex gap-3 mt-3">
          <button @click="toggleDetails" class="text-red-200 hover:text-red-100 text-sm underline">
            {{ showDetails ? 'Masquer les détails' : 'Voir les détails' }}
          </button>
          <button v-if="showRetry" @click="emit('retry')" 
                  class="text-red-200 hover:text-red-100 text-sm underline ml-auto">
            Réessayer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-display {
  animation: shake 0.3s ease-in-out;
}

.error-details {
  max-height: 200px;
  overflow-y: auto;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
</style>