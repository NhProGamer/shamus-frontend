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