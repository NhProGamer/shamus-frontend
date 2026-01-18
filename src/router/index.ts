import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import PlayView from "@/views/PlayView.vue";
import Callback from "@/views/Callback.vue";
import GameView from "@/views/GameView.vue";
import {useAuth, useOidcStore} from 'vue3-oidc'

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
    {
      path: "/oidc-callback",
      component: Callback,
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  const { autoAuthenticate, signinRedirect} = useAuth() as any
  const { state } = useOidcStore();
  const requiresAuth = to.matched.some(r => r.meta.requiresAuth)

  if (!requiresAuth) return next()

  await autoAuthenticate()

  const isAuth = state.value?.user != null
  if (!isAuth) {
    await signinRedirect()
  } else {
    next()
  }
})

export default router
