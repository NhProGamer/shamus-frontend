import { ref, onUnmounted, type Ref } from 'vue'

/**
 * Interface pour les messages WebSocket génériques
 * @template T - Type du payload pour un typage plus strict
 */
export interface WebSocketMessage<T = any> {
    type: string
    payload?: T
    [key: string]: any
}

/**
 * États possibles de la connexion WebSocket
 */
export type WebSocketStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error'

/**
 * Interface de retour du composable useWebSocket
 */
export interface UseWebSocketReturn {
    socket: Ref<WebSocket | null>
    status: Ref<WebSocketStatus>
    messages: Ref<WebSocketMessage[]>
    error: Ref<Event | null>
    connect: () => Promise<WebSocket>
    sendMsg: <T>(data: WebSocketMessage<T> | string) => void
    close: (code?: number, reason?: string) => void
    reconnect: () => Promise<WebSocket>
}

/**
 * Options de configuration pour le WebSocket
 */
export interface WebSocketOptions {
    autoReconnect?: boolean
    reconnectDelay?: number
    maxReconnectAttempts?: number
    protocols?: string | string[]
}

/**
 * Composable pour gérer les connexions WebSocket avec reconnexion automatique
 * @param url - URL du serveur WebSocket
 * @param options - Options de configuration
 * @returns Objet avec l'état et les méthodes de gestion WebSocket
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}): UseWebSocketReturn {
    // États réactifs avec typage explicite
    const socket = ref<WebSocket | null>(null)
    const status = ref<WebSocketStatus>('closed')
    const messages = ref<WebSocketMessage[]>([])
    const error = ref<Event | null>(null)
    
    // Configuration par défaut
    const config = {
        autoReconnect: true,
        reconnectDelay: 3000,
        maxReconnectAttempts: 5,
        ...options
    }

    let reconnectAttempts = 0
    let reconnectTimer: number | null = null

    /**
     * Met à jour l'état de la connexion
     */
    const updateStatus = (newStatus: WebSocketStatus) => {
        status.value = newStatus
        if (newStatus === 'error' || newStatus === 'closed') {
            if (config.autoReconnect && reconnectAttempts < (config.maxReconnectAttempts || Infinity)) {
                scheduleReconnect()
            }
        }
    }

    /**
     * Planifie une reconnexion automatique
     */
    const scheduleReconnect = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer)
        }
        
        reconnectTimer = window.setTimeout(() => {
            console.log(`[WebSocket] Tentative de reconnexion (${reconnectAttempts + 1}/${config.maxReconnectAttempts || '∞'})`)
            reconnect().catch(console.error)
        }, config.reconnectDelay)
    }

    /**
     * Initialise la connexion WebSocket.
     * Retourne une Promesse qui se résout quand la connexion est ouverte.
     */
    const connect = (): Promise<WebSocket> => {
        return new Promise((resolve, reject) => {
            reconnectAttempts = 0
            if (socket.value) {
                close(1000, 'Reconnecting')
            }

            try {
                updateStatus('connecting')
                const ws = new WebSocket(url, config.protocols)
                socket.value = ws
                ws.onopen = () => {
                    console.log(`[WebSocket] Connecté à ${url}`)
                    updateStatus('open')
                    error.value = null
                    reconnectAttempts = 0
                    resolve(ws)
                }
                ws.onmessage = (event: MessageEvent) => {
                    handleMessage(event.data)
                }
                ws.onerror = (e: Event) => {
                    console.error('[WebSocket] Erreur:', e)
                    error.value = e
                    updateStatus('error')
                    reject(e)
                }
                ws.onclose = (event) => {
                    console.log(`[WebSocket] Déconnecté (code: ${event.code}, raison: ${event.reason || 'unknown'})`)
                    updateStatus('closed')
                }

            } catch (e) {
                console.error('[WebSocket] Exception lors de la connexion:', e)
                error.value = new CustomEvent('WebSocketException', { detail: e })
                updateStatus('error')
                reject(e)
            }
        })
    }

    /**
     * Tentative de reconnexion
     */
    const reconnect = (): Promise<WebSocket> => {
        reconnectAttempts++
        return connect()
    }

    /**
     * Traite le message entrant (tente de parser du JSON)
     */
    const handleMessage = (data: string) => {
        try {
            const parsed: WebSocketMessage = JSON.parse(data)
            messages.value.push(parsed)
        } catch (e) {messages.value.push({ type: 'text', payload: data })
        }
    }

    /**
     * Envoie un message au serveur.
     * Gère automatiquement la conversion en JSON si c'est un objet.
     * @throws Error si le socket n'est pas connecté
     */
    const sendMsg = <T>(data: WebSocketMessage<T> | string) => {
        if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
            const errorMsg = '[WebSocket] Impossible d\'envoyer : non connecté.'
            console.warn(errorMsg)
            throw new Error(errorMsg)
        }

        try {
            const payload = typeof data === 'object' ? JSON.stringify(data) : data
            socket.value.send(payload)
        } catch (e) {
            console.error('[WebSocket] Erreur lors de l\'envoi:', e)
            throw e
        }
    }

    /**
     * Ferme manuellement la connexion
     * @param code - Code de fermeture (par défaut: 1000 - fermeture normale)
     * @param reason - Raison de la fermeture
     */
    const close = (code: number = 1000, reason: string = 'Normal closure') => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
        }
        
        if (socket.value) {
            socket.value.close(code, reason)
        }
    }

    // Nettoyage automatique
    onUnmounted(() => {
        close(1000, 'Component unmounted')
    })

    return {
        socket,
        status,
        messages,
        error,
        connect,
        sendMsg,
        close,
        reconnect
    }
}
