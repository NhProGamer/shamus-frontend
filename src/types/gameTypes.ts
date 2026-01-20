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
  id: string
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

export type PlayerID = string;

export type EventType =
    | 'connexion'
    | 'death'
    | 'turn'
    | 'deconnexion'
    | 'reconnexion'
    | 'night'
    | 'day'
    | 'role_reveal'
    | 'inactive'
    | 'chat_message'
    | 'host_change'
    | 'update_day'
    | 'update_composition';

export type EventChannel =
    | 'game_event'
    | 'conn_event'
    | 'settings_event'
    | 'timer_event';

export interface BaseEvent {
    channel: EventChannel;
    type: EventType;
    data: any;
}

// Specific event data types
export interface ConnexionEventData {
    player: PlayerID;
}

export interface DeathEventData {
    killer?: PlayerID;
    victim: PlayerID;
}

export interface ChatMessageData {
    playerID: PlayerID;
    nickname: string;
    message: string;
    channel: ChatChannel;
}


// Union of all possible events
export type GameEvent =
    | { channel: 'conn_event'; type: 'connexion'; data: ConnexionEventData }
    | { channel: 'game_event'; type: 'death'; data: DeathEventData }
    | { channel: 'game_event'; type: 'chat_message'; data: ChatMessageData }
    | { channel: 'conn_event'; type: 'deconnexion'; data: { player: PlayerID } }  // Assumed similar to connexion
    | { channel: 'game_event'; type: 'night'; data: {} }  // Placeholder
    | { channel: 'game_event'; type: 'day'; data: {} }    // Placeholder
    | { channel: 'game_event'; type: 'role_reveal'; data: { player: PlayerID } }  // Assumed
    | { channel: 'game_event'; type: 'inactive'; data: { player: PlayerID } }     // Assumed
    | { channel: 'game_event'; type: 'host_change'; data: { player: PlayerID } }; // Assumed

// Utility to narrow event type
export function isConnexionEvent(event: GameEvent): event is Extract<GameEvent, {type: 'connexion'}> {
    return event.type === 'connexion';
}

// Add similar type guards for other events as needed
