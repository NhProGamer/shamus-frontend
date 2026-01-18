/**
 * Types et interfaces pour le jeu Shamus
 * Ce fichier contient tous les types et interfaces utilisés dans l'application
 */

// Types pour les onglets et canaux
export type MainTab = 'chat' | 'composition' | 'settings'
export type ChatChannel = 'village' | 'loups' | 'amoureux'

// Types pour l'état du jeu
export type GamePhase = 'day' | 'night'

// Interface pour les messages de chat
export interface ChatMessage {
  id: number
  pseudo: string
  content: string
  channel: ChatChannel
  timestamp: string
  isSystem?: boolean // Pour les messages narratifs
}

// Interface pour les joueurs
export interface Player {
  id: string
  name: string
  role: string
  isAlive: boolean
}

// Interface pour l'état du jeu
export interface GameState {
  currentPhase: GamePhase
  nightNumber: number
  players: Player[]
}

// Types pour les messages WebSocket spécifiques au jeu
export interface GameWebSocketMessage {
  type: string
  payload?: any
  [key: string]: any
}

// Types spécifiques pour les différents types de messages
export interface ChatMessagePayload {
  sender: string
  content: string
  channel: ChatChannel
  timestamp: string
}

export interface GameStateUpdatePayload extends GameState {}

export interface SystemMessagePayload {
  content: string
  channel?: ChatChannel
}

export interface JoinGamePayload {
  id: string
  user: string
}

// Type pour les messages de chat entrants
export interface IncomingChatMessage {
  type: 'CHAT_MESSAGE'
  payload: ChatMessagePayload
}

// Type pour les mises à jour d'état de jeu
export interface GameStateUpdateMessage {
  type: 'GAME_STATE_UPDATE'
  payload: GameStateUpdatePayload
}

// Type pour les messages système
export interface SystemMessage {
  type: 'SYSTEM_MESSAGE'
  payload: SystemMessagePayload
}

// Type pour les messages de connexion
export interface JoinGameMessage {
  type: 'JOIN_GAME'
  payload: JoinGamePayload
}

// Union type pour tous les types de messages possibles
export type GameMessage = 
  | IncomingChatMessage 
  | GameStateUpdateMessage 
  | SystemMessage 
  | JoinGameMessage