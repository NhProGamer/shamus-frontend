/**
 * useGameWebSocket Composable
 * 
 * Game-specific WebSocket connection management.
 * Wraps the generic useWebSocket composable with game-specific send methods.
 */

import { ref, shallowRef, type Ref } from 'vue'
import { useWebSocket, type UseWebSocketReturn, type WebSocketMessage } from './useWebSocket'
import type {
  Event as GameEvent,
  PlayerID,
  WitchActionData,
} from '@/types'

// Import event constants
import {
  EventChannelGameEvent,
  EventTypeStartGame,
  EventTypeVillageVote,
  EventTypeSeerAction,
  EventTypeWerewolfVote,
  EventTypeWitchAction,
} from '@/types/events'

export interface UseGameWebSocketOptions {
  gameId: string
  accessToken: string
  autoReconnect?: boolean
  reconnectDelay?: number
  maxReconnectAttempts?: number
  onReceive?: (message: WebSocketMessage) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (event: Event) => void
}

export interface UseGameWebSocketReturn extends Omit<UseWebSocketReturn, 'send'> {
  sendStartGame: () => void
  sendVillageVote: (targetId: PlayerID | null) => void
  sendSeerAction: (targetId: PlayerID) => void
  sendWerewolfVote: (targetId: PlayerID | null) => void
  sendWitchAction: (healTargetId?: PlayerID, poisonTargetId?: PlayerID) => void
  sendRaw: (message: string) => void
}

/**
 * Create a game-specific WebSocket connection
 */
export function useGameWebSocket(options: UseGameWebSocketOptions): UseGameWebSocketReturn {
  const {
    gameId,
    accessToken,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 10,
    onReceive,
    onConnected,
    onDisconnected,
    onError,
  } = options

  // Construct WebSocket URL
  const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'
  const wsUrl = `${WS_BASE_URL}/app/ws/${gameId}?access_token=${accessToken}`

  // Create WebSocket connection
  const ws = useWebSocket(wsUrl, {
    autoReconnect,
    reconnectDelay,
    maxReconnectAttempts,
    onReceive,
    onConnected,
    onDisconnected,
    onError,
  })

  /**
   * Generic send function for raw JSON messages
   */
  function sendRaw(message: string): void {
    ws.send(message)
  }

  /**
   * Send a typed game event
   */
  function sendEvent<T>(event: GameEvent<T>): void {
    try {
      sendRaw(JSON.stringify(event))
    } catch (e) {
      console.error('Error sending game event:', e)
    }
  }

  /**
   * Start game (host only)
   */
  function sendStartGame(): void {
    const event: GameEvent<Record<string, never>> = {
      channel: EventChannelGameEvent,
      type: EventTypeStartGame,
      data: {},
    }
    sendEvent(event)
  }

  /**
   * Send village vote during day phase
   */
  function sendVillageVote(targetId: PlayerID | null): void {
    const event: GameEvent<{ targetId: PlayerID | null }> = {
      channel: EventChannelGameEvent,
      type: EventTypeVillageVote,
      data: { targetId },
    }
    sendEvent(event)
  }

  /**
   * Send seer action during night phase
   */
  function sendSeerAction(targetId: PlayerID): void {
    const event: GameEvent<{ targetId: PlayerID }> = {
      channel: EventChannelGameEvent,
      type: EventTypeSeerAction,
      data: { targetId },
    }
    sendEvent(event)
  }

  /**
   * Send werewolf vote during night phase
   */
  function sendWerewolfVote(targetId: PlayerID | null): void {
    const event: GameEvent<{ targetId: PlayerID | null }> = {
      channel: EventChannelGameEvent,
      type: EventTypeWerewolfVote,
      data: { targetId },
    }
    sendEvent(event)
  }

  /**
   * Send witch action during night phase
   */
  function sendWitchAction(healTargetId?: PlayerID, poisonTargetId?: PlayerID): void {
    const event: GameEvent<WitchActionData> = {
      channel: EventChannelGameEvent,
      type: EventTypeWitchAction,
      data: { healTargetId, poisonTargetId },
    }
    sendEvent(event)
  }

  return {
    // WebSocket state and methods
    status: ws.status,
    data: ws.data,
    error: ws.error,
    connect: ws.connect,
    close: ws.close,
    reconnect: ws.reconnect,
    
    // Game-specific send methods
    sendStartGame,
    sendVillageVote,
    sendSeerAction,
    sendWerewolfVote,
    sendWitchAction,
    sendRaw,
  }
}
