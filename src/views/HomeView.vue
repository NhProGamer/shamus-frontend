<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

// État réactif
const playerCount = ref(0)
const isServerOnline = ref(false)

// Simulation appel API
onMounted(() => {
  // Simule un ping serveur
  setTimeout(() => {
    isServerOnline.value = true
    playerCount.value = 42
  }, 800)
})
</script>

<template>
  <!-- Container principal avec la classe font-vt323 (définie via l'import dans le CSS global) -->
  <div class="shamus-wrapper flex min-h-screen w-full flex-col items-center justify-center p-4 font-['VT323']">

    <!-- Halo de lune -->
    <div class="fixed top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/20 blur-[100px]"></div>

    <main class="w-full max-w-lg text-center relative z-10">

      <!-- En-tête -->
      <div class="mb-10">
        <h1 class="text-7xl leading-none text-white drop-shadow-[4px_4px_0_#4c1d95]">
          SHAMUS
        </h1>
        <div class="mt-2 inline-block bg-black/40 px-3 py-1 text-xl text-purple-300 backdrop-blur-sm">
          &lt; Le Village dort... &gt;
        </div>
      </div>

      <!-- La Carte Pixel -->
      <div class="pixel-card p-1">
        <div class="mb-1 flex items-center justify-between bg-[#0f0518] px-3 py-2">
          <span class="text-xl tracking-wider text-purple-400">MENU_PRINCIPAL.EXE</span>
          <div class="flex gap-1.5">
            <div class="h-3 w-3 bg-red-500"></div>
            <div class="h-3 w-3 bg-yellow-500"></div>
          </div>
        </div>

        <div class="flex flex-col gap-8 px-6 py-8">
          <p class="text-2xl text-gray-300">Prêt à survivre à la nuit ?</p>

          <!-- Navigation -->
          <nav class="flex flex-col gap-4">
            <!-- Utilise RouterLink si tu as d'autres pages, sinon <a> pour l'instant -->
            <RouterLink to="/play" class="btn-pixel-primary w-full py-3 text-3xl uppercase tracking-widest hover:brightness-110">
              JOUER
            </RouterLink>

            <div class="grid grid-cols-2 gap-4">
              <RouterLink to="/rules" class="btn-pixel-secondary py-2 text-2xl uppercase">Règles</RouterLink>
              <RouterLink to="/account" class="btn-pixel-secondary py-2 text-2xl uppercase">Compte</RouterLink>
            </div>
          </nav>

          <!-- Footer status -->
          <div class="mt-2 border-t-2 border-[#1e1b29] pt-4 text-left text-lg text-gray-500 flex items-center">
            <span class="mr-2 inline-block h-3 w-3 rounded-full transition-colors duration-300"
                  :class="isServerOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'"></span>
            <span>{{ playerCount }} Joueurs en ligne</span>
          </div>
        </div>
      </div>

      <footer class="mt-8 text-lg text-gray-600">© 2026 NhSoul.</footer>
    </main>
  </div>
</template>

<style scoped>
/* Variables locales : on ne pollue pas le CSS global */
.shamus-wrapper {
  --color-night-dark: #0f0518;
  --color-night-light: #241a3e;
  --color-moon: #e2e8f0;
  --color-blood: #dc2626;
  --color-blood-dark: #991b1b;
  --color-border-light: #584c75;
  --color-border-dark: #08020d;

  background-color: var(--color-night-dark);
  color: var(--color-moon);
  background-image: radial-gradient(var(--color-night-light) 1px, transparent 1px);
  background-size: 4px 4px;
}

/* Styles utilitaires spécifiques au Pixel Art */
.pixel-card {
  background-color: var(--color-night-light);
  border-top: 4px solid var(--color-border-light);
  border-left: 4px solid var(--color-border-light);
  border-right: 4px solid var(--color-border-dark);
  border-bottom: 4px solid var(--color-border-dark);
  box-shadow: 6px 6px 0px rgba(0,0,0,0.6);
}

.btn-pixel-primary {
  background-color: var(--color-blood);
  color: white;
  border-top: 2px solid #ff8888;
  border-left: 2px solid #ff8888;
  border-right: 2px solid var(--color-blood-dark);
  border-bottom: 2px solid var(--color-blood-dark);
  box-shadow: 0 4px 0 var(--color-border-dark);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-pixel-primary:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 var(--color-border-dark);
}

.btn-pixel-secondary {
  background-color: #1e1b29;
  color: var(--color-moon);
  border-top: 2px solid var(--color-border-light);
  border-left: 2px solid var(--color-border-light);
  border-right: 2px solid var(--color-border-dark);
  border-bottom: 2px solid var(--color-border-dark);
  box-shadow: 0 4px 0 var(--color-border-dark);
  transition: transform 0.1s, box-shadow 0.1s;
}
.btn-pixel-secondary:hover { background-color: #2d2640; }
.btn-pixel-secondary:active {
  transform: translateY(4px);
  box-shadow: 0 0 0 var(--color-border-dark);
}
</style>
