import type {PlayerID} from "@/types/player.ts";
import type {GameID, GamePhase, GameStatus} from "@/types/game.ts";
import type {RoleType} from "@/types/roles.ts";

export type EventType = string;
export type EventChannel = string;
export type ConnectionState = string;

// Constantes pour les channels d'événements
export const EventChannelGameEvent: EventChannel = "game_event";
export const EventChannelConnexion: EventChannel = "conn_event";
export const EventChannelSettings: EventChannel = "settings_event";
export const EventChannelTimer: EventChannel = "timer_event";

// Constantes pour les types d'événements
export const EventTypeGameSettings: EventType = "settings";
export const EventTypeGameData: EventType = "game_data";
export const EventTypeChatMessage: EventType = "chat_message";
export const EventTypeConnexion: EventType = "connexion";
export const EventTypeDeconnexion: EventType = "deconnexion";
export const EventTypeReconnexion: EventType = "reconnexion";
export const EventTypeInactive: EventType = "inactive";
export const EventTypeGameHostChange: EventType = "host_change";

// Interface générique pour Event
export interface Event<T> {
    channel: EventChannel;
    type: EventType;
    data: T;
}


// Interface GameSettings
export interface GameSettings {
    roles: Record<RoleType, number>;
}

// Interface GameSettingsEventData
export interface GameSettingsEventData {
    roles: Record<RoleType, number>;
}

// Interface PlayersDetailsData
export interface PlayersDetailsData {
    id: PlayerID;
    username: string
    alive: boolean;
    role?: RoleType | null;
    target?: PlayerID | null;
    connexion_state: ConnectionState;
}

// Interface GameDataEventData
export interface GameDataEventData {
    id: GameID;
    status: GameStatus;
    phase: GamePhase;
    day: number;
    players: PlayersDetailsData[];
    host: PlayerID;
    settings: GameSettings;
}

// Interface ChatMessageEvent
export interface ChatMessageEvent {
    playerID: PlayerID;
    nickname?: string;
    message: string;
    channel: string;
}

// Interface ConnexionEvent
export interface ConnexionEvent {
    player: PlayerID;
}

// Interface DeconnexionEvent
export interface DeconnexionEvent {
    player: PlayerID;
}

// Interface ReconnexionEventData
export interface ReconnexionEventData {
    player: PlayerID;
}

// Interface InactiveEventData
export interface InactiveEventData {
    player: PlayerID;
}

// Interface HostChangeEventData
export interface HostChangeEventData {
    host: PlayerID;
}

// Types d'événements spécifiques (combinaison Event + Data)
export type GameSettingsEvent = Event<GameSettingsEventData>;
export type GameDataEvent = Event<GameDataEventData>;
export type ChatMessageEventType = Event<ChatMessageEvent>;
export type ConnexionEventType = Event<ConnexionEvent>;
export type DeconnexionEventType = Event<DeconnexionEvent>;
export type ReconnexionEvent = Event<ReconnexionEventData>;
export type InactiveEvent = Event<InactiveEventData>;
export type HostChangeEvent = Event<HostChangeEventData>;
