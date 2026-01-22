import axios, { type AxiosInstance, type AxiosError } from 'axios'
import { userManager } from '@/oidc'

// Configuration de base
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Instance axios configurée
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/app/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  async (config) => {
    const user = await userManager.getUser()
    if (user?.access_token) {
      config.headers.Authorization = `Bearer ${user.access_token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Intercepteur pour gérer les erreurs
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Si token expiré, tenter un refresh
    if (error.response?.status === 401) {
      try {
        await userManager.signinSilent()
        // Retry la requête originale
        const user = await userManager.getUser()
        if (user?.access_token && error.config) {
          error.config.headers.Authorization = `Bearer ${user.access_token}`
          return apiClient.request(error.config)
        }
      } catch {
        // Redirect to login
        await userManager.signinRedirect()
      }
    }
    return Promise.reject(error)
  }
)

// Types pour les réponses API
export interface CreateGameResponse {
  gameID: string
}

export interface ApiError {
  code: string
  message: string
}

// Service Game API
export const gameApi = {
  /**
   * Créer une nouvelle partie
   */
  async createGame(): Promise<CreateGameResponse> {
    const response = await apiClient.post<CreateGameResponse>('/game')
    return response.data
  },

  /**
   * Rejoindre une partie (si endpoint existe)
   */
  async joinGame(gameId: string): Promise<void> {
    await apiClient.post(`/game/${gameId}/join`)
  }
}

export default apiClient
