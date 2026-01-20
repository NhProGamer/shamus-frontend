// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { userManager } from '@/oidc' // Importez votre instance

import HomeView from '@/views/HomeView.vue'
import PlayView from "@/views/PlayView.vue";
import Callback from "@/views/Callback.vue";
import GameView from "@/views/GameView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/play',
      name: 'play',
      component: PlayView,
      meta: { requiresAuth: true }
    },
    {
      path: '/game',
      name: 'game',
      component: GameView,
      meta: { requiresAuth: true }
    },
    {
      path: '/rules',
      name: 'rules',
      component: HomeView,
    },
    {
      path: '/account',
      name: 'account',
      component: HomeView,
    },
    // La route de callback
    {
      path: "/oidc-callback",
      name: 'callback',
      component: Callback, // Ce composant doit gérer le traitement du code
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  // Vérification si la route nécessite une auth
  if (to.matched.some(r => r.meta.requiresAuth)) {
    const user = await userManager.getUser();

    // Si pas d'utilisateur ou token expiré
    if (!user || user.expired) {
      // Sauvegarde l'URL où l'utilisateur voulait aller
      await userManager.signinRedirect({
        state: { path: to.fullPath }
      });
      return; // On coupe l'exécution ici, la redirection va se faire
    }
  }

  next();
})

export default router
