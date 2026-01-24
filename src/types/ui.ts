import type { ChatMessageEvent } from './events'

export type MainTab = 'chat' | 'composition' | 'settings'
export type ChatChannel = 'village' | 'werewolf' | 'lovers'

export interface ChatMessage {
  id: string
  pseudo: string
  content: string
  channel: ChatChannel
  timestamp: string
  isSystem?: boolean
}

/**
 * Extended chat message type for UI rendering
 * Combines server ChatMessageEvent with client-side UI metadata
 */
export type UIMessage = ChatMessageEvent & {
  id: string
  isSystem: boolean
  timestamp: string
}