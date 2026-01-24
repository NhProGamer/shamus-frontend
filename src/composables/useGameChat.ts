/**
 * useGameChat Composable
 * 
 * Manages game chat messages, including player messages and system notifications.
 * Provides utilities for adding messages from various sources.
 */

import { ref, computed, type Ref } from 'vue'
import type { ChatMessageEvent, ChatChannel, UIMessage } from '@/types'

export interface UseGameChatReturn {
  messages: Ref<UIMessage[]>
  addChatMessage: (data: ChatMessageEvent) => void
  addSystemMessage: (message: string, channel?: ChatChannel) => void
  addLocalMessage: (playerID: string, message: string, channel: string, nickname?: string, isSystem?: boolean) => void
  clearMessages: () => void
  getMessagesByChannel: (channel: ChatChannel) => UIMessage[]
}

/**
 * Composable for managing game chat messages
 */
export function useGameChat(): UseGameChatReturn {
  const messages = ref<UIMessage[]>([])

  /**
   * Add a chat message received from the server
   */
  function addChatMessage(data: ChatMessageEvent): void {
    messages.value.push({
      ...data,
      id: crypto.randomUUID(),
      isSystem: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
  }

  /**
   * Add a system message (e.g., game events, announcements)
   */
  function addSystemMessage(message: string, channel: ChatChannel = 'village'): void {
    addLocalMessage('system', message, channel, 'SYSTÈME', true)
  }

  /**
   * Add a local message (generic)
   * Used for both player messages and system messages
   */
  function addLocalMessage(
    playerID: string,
    messageContent: string,
    channel: string,
    nickname: string = 'Inconnu',
    isSystem = false
  ): void {
    messages.value.push({
      id: crypto.randomUUID(),
      playerID,
      nickname,
      message: messageContent,
      channel,
      isSystem,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })
  }

  /**
   * Clear all messages
   */
  function clearMessages(): void {
    messages.value = []
  }

  /**
   * Get messages filtered by channel
   */
  function getMessagesByChannel(channel: ChatChannel): UIMessage[] {
    return messages.value.filter(msg => msg.channel === channel)
  }

  return {
    messages,
    addChatMessage,
    addSystemMessage,
    addLocalMessage,
    clearMessages,
    getMessagesByChannel,
  }
}
