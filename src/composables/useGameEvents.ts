/**
 * useGameEvents Composable
 * 
 * Handles incoming WebSocket events and dispatches them to the appropriate handlers.
 * This composable centralizes all event routing logic for the game.
 */

import type { WebSocketMessage } from './useWebSocket'
import type { useGameStore } from '@/stores/gameStore'
import type { useNotificationStore } from '@/stores/notificationStore'
import type {
  Event,
  ChatMessageEvent,
  GameDataEventData,
  DayEventData,
  VoteEventData,
  DeathEventData,
  WinEventData,
  RoleRevealEventData,
  SeerRevealEventData,
  TurnEventData,
  ErrorEventData,
  AckEventData,
  HostChangeEventData,
  GameSettingsEventData,
  TimerEventData,
} from '@/types'

// Import event constants as values (not types)
import {
  EventChannelGameEvent,
  EventChannelSettings,
  EventChannelTimer,
  EventChannelConnexion,
  EventTypeChatMessage,
  EventTypeGameData,
  EventTypeDay,
  EventTypeNight,
  EventTypeVote,
  EventTypeDeath,
  EventTypeWin,
  EventTypeRoleReveal,
  EventTypeSeerReveal,
  EventTypeTurn,
  EventTypeError,
  EventTypeAck,
  EventTypeGameSettings,
  EventTypeTimer,
  EventTypeGameHostChange,
} from '@/types/events'

import { getErrorMessage } from '@/utils/errorMessages'

export interface UseGameEventsOptions {
  gameStore: ReturnType<typeof useGameStore>
  notificationStore: ReturnType<typeof useNotificationStore>
  onChatMessage?: (data: ChatMessageEvent) => void
  onGameData?: (data: GameDataEventData) => void
  onSettingsUpdate?: (data: GameSettingsEventData) => void
  onSettingsError?: (message: string) => void
}

export function useGameEvents(options: UseGameEventsOptions) {
  const {
    gameStore,
    notificationStore,
    onChatMessage,
    onGameData,
    onSettingsUpdate,
    onSettingsError,
  } = options

  /**
   * Main event dispatcher
   * Routes incoming WebSocket messages to appropriate handlers
   */
  function handleMessage(message: WebSocketMessage): void {
    // Handle text-based error messages from server
    if (message.type === 'text' && message.payload) {
      onSettingsError?.(message.payload as string)
      return
    }

    // Cast to generic Event interface
    const event = message as Event<unknown>

    // Basic validation
    if (!event || !event.type) {
      console.warn('Invalid event received:', message)
      return
    }

    // Dispatch based on channel
    switch (event.channel) {
      case EventChannelGameEvent:
        handleGameEvent(event)
        break
      case EventChannelSettings:
        handleSettingsEvent(event)
        break
      case EventChannelTimer:
        handleTimerEvent(event)
        break
      case EventChannelConnexion:
        handleConnectionEvent(event)
        break
      default:
        console.log('Unknown channel:', event.channel, event)
    }
  }

  /**
   * Handle game channel events
   */
  function handleGameEvent(event: Event<unknown>): void {
    switch (event.type) {
      case EventTypeChatMessage:
        onChatMessage?.(event.data as ChatMessageEvent)
        break

      case EventTypeGameData:
        onGameData?.(event.data as GameDataEventData)
        break

      case EventTypeDay:
        gameStore.handleDayEvent(event.data as DayEventData)
        break

      case EventTypeNight:
        gameStore.handleNightEvent()
        break

      case EventTypeVote:
        gameStore.handleVoteEvent(event.data as VoteEventData)
        break

      case EventTypeDeath:
        gameStore.handleDeathEvent(event.data as DeathEventData)
        break

      case EventTypeWin:
        gameStore.handleWinEvent(event.data as WinEventData)
        break

      case EventTypeRoleReveal:
        gameStore.handleRoleReveal(event.data as RoleRevealEventData)
        break

      case EventTypeSeerReveal:
        gameStore.handleSeerReveal(event.data as SeerRevealEventData)
        break

      case EventTypeTurn:
        gameStore.handleTurnEvent(event.data as TurnEventData)
        break

      case EventTypeError:
        const errorData = event.data as ErrorEventData
        gameStore.handleErrorEvent(errorData)
        notificationStore.showError(getErrorMessage(errorData.code))
        break

      case EventTypeAck:
        const ackData = event.data as AckEventData
        gameStore.handleAckEvent(ackData)
        if (ackData.message) {
          notificationStore.showSuccess(ackData.message)
        }
        break

      default:
        console.log('Unhandled game event:', event.type, event.data)
    }
  }

  /**
   * Handle settings channel events
   */
  function handleSettingsEvent(event: Event<unknown>): void {
    switch (event.type) {
      case EventTypeGameSettings:
        onSettingsUpdate?.(event.data as GameSettingsEventData)
        break

      default:
        console.log('Unhandled settings event:', event.type, event.data)
    }
  }

  /**
   * Handle timer channel events
   */
  function handleTimerEvent(event: Event<unknown>): void {
    switch (event.type) {
      case EventTypeTimer:
        gameStore.handleTimerEvent(event.data as TimerEventData)
        break

      default:
        console.log('Unhandled timer event:', event.type, event.data)
    }
  }

  /**
   * Handle connection channel events
   */
  function handleConnectionEvent(event: Event<unknown>): void {
    switch (event.type) {
      case EventTypeGameHostChange:
        gameStore.handleHostChange(event.data as HostChangeEventData)
        break

      default:
        console.log('Unhandled connection event:', event.type, event.data)
    }
  }

  return {
    handleMessage,
  }
}
