<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { userManager } from '@/oidc'

const router = useRouter()
const gameCode = ref('')

const handleJoin = () => {
  if (gameCode.value.length < 3) return
  console.log('Rejoindre la partie:', gameCode.value)
  // router.push(`/lobby/${gameCode.value}`)
}

const handleCreate = async () => {
  console.log('Création de partie...')

  const user = await userManager.getUser()

  if (!user || user.expired) {
    console.error("Utilisateur non authentifié ou session expirée")
    // await userManager.signinRedirect()
    userManager.startSilentRenew()
    return
  }

  const token = user.id_token

  console.log("Token utilisé:", token)

  try {
    const res = await axios.post('http://localhost:8080/app/api/v1/game', null, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log("Game ID:", res.data.gameID)
    router.push(`/game?gameID=${res.data.gameID}`)
  } catch (error) {
    console.error("Erreur lors de la création de la partie:", error)
  }
}
</script>


<template>
  <div class="shamus-wrapper flex min-h-screen w-full flex-col items-center justify-center p-4 font-['VT323']">

    <!-- Halo de lune -->
    <div class="fixed top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-900/20 blur-[100px]"></div>

    <main class="w-full max-w-lg text-center relative z-10">

      <!-- En-tête simplifié -->
      <div class="mb-8">
        <h1 class="text-5xl leading-none text-white drop-shadow-[3px_3px_0_#4c1d95] opacity-80">
          SHAMUS
        </h1>
      </div>

      <!-- La Carte Pixel -->
      <div class="pixel-card p-1">
        <!-- Barre de titre avec bouton Retour -->
        <div class="mb-1 flex items-center justify-between bg-[#0f0518] px-3 py-2">
          <span class="text-xl tracking-wider text-purple-400">CONNEXION.EXE</span>

          <!-- Bouton X pour fermer/retour -->
          <RouterLink to="/" class="group flex h-6 w-6 items-center justify-center bg-red-900 hover:bg-red-600 border border-red-950 transition-colors">
            <span class="text-white text-lg leading-none mt-[-2px]">×</span>
          </RouterLink>
        </div>

        <div class="flex flex-col gap-8 px-6 py-8">

          <!-- SECTION 1 : REJOINDRE -->
          <div class="flex flex-col gap-3">
            <label class="text-left text-2xl text-purple-200 uppercase tracking-wide">
              Code d'accès
            </label>
            <div class="flex gap-2">
              <input
                  v-model="gameCode"
                  type="text"
                  placeholder="EX: A7F2"
                  maxlength="6"
                  class="pixel-input w-full px-4 py-2 text-3xl uppercase tracking-widest text-white focus:outline-none placeholder-purple-800/50"
                  @keyup.enter="handleJoin"
              />
              <button
                  @click="handleJoin"
                  class="btn-pixel-secondary px-4 text-2xl"
                  :class="{ 'opacity-50 cursor-not-allowed': gameCode.length < 1 }"
              >
                OK
              </button>
            </div>
          </div>

          <!-- Séparateur -->
          <div class="relative flex items-center py-2">
            <div class="flex-grow border-t border-purple-900/50"></div>
            <span class="flex-shrink-0 px-4 text-purple-500 text-xl">OU</span>
            <div class="flex-grow border-t border-purple-900/50"></div>
          </div>

          <!-- SECTION 2 : CRÉER -->
          <div class="flex flex-col gap-3">
            <p class="text-lg text-gray-400 text-left">
              Tu veux être le maître du jeu ?
            </p>
            <button
                @click="handleCreate"
                class="btn-pixel-primary w-full py-4 text-3xl uppercase tracking-widest flex flex-col items-center justify-center gap-1 group"
            >
              <span>Créer une partie</span>
              <span class="text-sm opacity-70 normal-case font-sans tracking-normal group-hover:text-white text-red-100">
                (Nouvelle Partie)
              </span>
            </button>
          </div>

        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* --- THÈME & CONFIG (Identique HomeView) --- */
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

/* --- COMPOSANTS UI --- */

.pixel-card {
  background-color: var(--color-night-light);
  border-top: 4px solid var(--color-border-light);
  border-left: 4px solid var(--color-border-light);
  border-right: 4px solid var(--color-border-dark);
  border-bottom: 4px solid var(--color-border-dark);
  box-shadow: 6px 6px 0px rgba(0,0,0,0.6);
}

/* INPUT "EN CREUX" (Inset) */
.pixel-input {
  background-color: #050208; /* Fond très noir */
  /* Bordures inversées pour effet creusé */
  border-top: 3px solid var(--color-border-dark);
  border-left: 3px solid var(--color-border-dark);
  border-bottom: 3px solid var(--color-border-light);
  border-right: 3px solid var(--color-border-light);
}
.pixel-input:focus {
  background-color: #0f0518;
  border-top-color: var(--color-accent); /* Focus violet */
  border-left-color: var(--color-accent);
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
