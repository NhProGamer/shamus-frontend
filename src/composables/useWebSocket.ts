import { ref, onUnmounted, type Ref, shallowRef } from 'vue'

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
    status: Ref<WebSocketStatus>
    data: Ref<WebSocketMessage | null>
    error: Ref<Event | null>
    connect: () => Promise<void>
    send: <T>(data: WebSocketMessage<T> | string) => void
    close: (code?: number, reason?: string) => void
    reconnect: () => Promise<void>
}

/**
 * Options de configuration pour le WebSocket
 */
export interface WebSocketOptions {
    autoReconnect?: boolean
    reconnectDelay?: number
    maxReconnectAttempts?: number
    protocols?: string | string[]
    onReceive?: (data: WebSocketMessage) => void
    onConnected?: (ws: WebSocket) => void
    onDisconnected?: (event: CloseEvent) => void
    onError?: (event: Event) => void
}

/**
 * Composable pour gérer les connexions WebSocket avec reconnexion automatique
 * @param url - URL du serveur WebSocket
 * @param options - Options de configuration
 * @returns Objet avec l'état et les méthodes de gestion WebSocket
 */
export function useWebSocket(url: string, options: WebSocketOptions = {}): UseWebSocketReturn {
    // États réactifs avec typage explicite
    const socket = shallowRef<WebSocket | null>(null)
    const status = ref<WebSocketStatus>('closed')
    const data = shallowRef<WebSocketMessage | null>(null)
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
        if (reconnectTimer) return
        
        reconnectTimer = window.setTimeout(() => {
            console.log(`[WebSocket] Tentative de reconnexion (${reconnectAttempts + 1}/${config.maxReconnectAttempts || '∞'})`)
            reconnect().catch(console.error)
        }, config.reconnectDelay)
    }

    /**
     * Initialise la connexion WebSocket.
     */
    const connect = (): Promise<void> => {
        return new Promise((resolve) => {
            // Si déjà connecté ou en cours, on ne fait rien (ou on pourrait forcer la fermeture avant)
            if (socket.value && (socket.value.readyState === WebSocket.OPEN || socket.value.readyState === WebSocket.CONNECTING)) {
                resolve()
                return
            }

            if (reconnectTimer) {
                clearTimeout(reconnectTimer)
                reconnectTimer = null
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
                    config.onConnected?.(ws)
                    resolve()
                }

                ws.onmessage = (event: MessageEvent) => {
                    handleMessage(event.data)
                }

                ws.onerror = (e: Event) => {
                    console.error('[WebSocket] Erreur:', e)
                    error.value = e
                    config.onError?.(e)
                    // Note: onerror est souvent suivi de onclose
                }

                ws.onclose = (event) => {
                    console.log(`[WebSocket] Déconnecté (code: ${event.code})`)
                    config.onDisconnected?.(event)
                    updateStatus('closed')
                    socket.value = null
                }

            } catch (e) {
                console.error('[WebSocket] Exception exécution:', e)
                updateStatus('error')
                // On laisse le mécanisme de retry gérer ça via updateStatus('error')
            }
        })
    }

    /**
     * Tentative de reconnexion manuelle ou automatique
     */
    const reconnect = async (): Promise<void> => {
        close(1000, 'Reconnecting')
        reconnectAttempts++
        await connect()
    }

    /**
     * Traite le message entrant (tente de parser du JSON)
     */
    const handleMessage = (rawData: string) => {
        try {
            const parsed: WebSocketMessage = JSON.parse(rawData)
            data.value = parsed
            config.onReceive?.(parsed)
        } catch (e) {
            // Si ce n'est pas du JSON, on l'emballe dans un format générique si besoin,
            // ou on ignore / log. Ici on supporte le texte brut.
            const textMsg = { type: 'text', payload: rawData }
            data.value = textMsg
            config.onReceive?.(textMsg)
        }
    }

    /**
     * Envoie un message au serveur.
     */
    const send = <T>(content: WebSocketMessage<T> | string) => {
        if (!socket.value || socket.value.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Envoi impossible : non connecté.')
            return
        }
        try {
            const payload = typeof content === 'object' ? JSON.stringify(content) : content
            socket.value.send(payload)
        } catch (e) {
            console.error('[WebSocket] Erreur envoi:', e)
        }
    }

    /**
     * Ferme manuellement la connexion
     */
    const close = (code: number = 1000, reason: string = 'Normal closure') => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
        }
        
        if (socket.value) {
            // Éviter de déclencher onclose en boucle si on ferme manuellement ? 
            // Généralement on veut que onclose soit appelé pour mettre à jour le state.
            socket.value.close(code, reason)
        }
    }

    // Nettoyage automatique
    onUnmounted(() => {
        close(1000, 'Component unmounted')
    })

    return {
        status,
        data,
        error,
        connect,
        send,
        close,
        reconnect
    }
}
