<!-- src/App.vue -->
<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, provide } from 'vue' // <--- Ajout de 'provide'

// --- ÉTAT DU CHARGEMENT ---
const isLoading = ref(false) // On part de false par défaut maintenant

const showLoading = () => {
  isLoading.value = true
}
const stopLoading = () => {
  isLoading.value = false
}
// On "donne" cette fonction à tous les composants enfants
provide('showLoading', showLoading)
provide('hideLoading', stopLoading)

</script>

<template>
  <!-- L'écran de chargement s'affiche si isLoading est true -->
  <Transition name="fade">
    <div v-if="isLoading" class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0518] font-['VT323'] text-[#e2e8f0]">
      <h1 class="mb-2 text-6xl animate-pulse text-white drop-shadow-[4px_4px_0_#4c1d95]">SHAMUS</h1>
      <p class="mb-12 text-xl text-purple-300 tracking-widest">CHARGEMENT DE LA PARTIE...</p>
    </div>
  </Transition>

  <RouterView />
</template>

<style>
.fade-leave-active { transition: opacity 0.5s ease; }
.fade-leave-to { opacity: 0; }
</style>
