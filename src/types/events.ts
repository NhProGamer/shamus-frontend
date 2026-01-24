import type { PlayerID } from "@/types/player"
import type { GameID, GamePhase, GameStatus } from "@/types/game"
import type { RoleType } from "@/types/roles"

// Strict type definitions for type safety
export type EventType = 
    | 'settings' 
    | 'game_data' 
    | 'chat_message' 
    | 'connection'
    | 'disconnection'
    | 'reconnection'
    | 'inactive'
    | 'host_change'
    | 'timer' 
    | 'turn' 
    | 'vote' 
    | 'day' 
    | 'night' 
    | 'death' 
    | 'win' 
    | 'role_reveal' 
    | 'seer_reveal'
    | 'error' 
    | 'ack'
    | 'start_game'
    | 'village_vote'
    | 'seer_action'
    | 'werewolf_vote'
    | 'witch_action';

export type EventChannel = 'game_event' | 'conn_event' | 'settings_event' | 'timer_event';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

// Clan types for win conditions
export type Clan = 'werewolf' | 'villager' | 'lovers' | 'none'

// Event channels
export const EventChannelGameEvent: EventChannel = "game_event";
export const EventChannelConnexion: EventChannel = "conn_event";
export const EventChannelSettings: EventChannel = "settings_event";
export const EventChannelTimer: EventChannel = "timer_event";

// Event types - Server → Client (existing)
export const EventTypeGameSettings: EventType = "settings";
export const EventTypeGameData: EventType = "game_data";
export const EventTypeChatMessage: EventType = "chat_message";
export const EventTypeConnection: EventType = "connection";
export const EventTypeDisconnection: EventType = "disconnection";
export const EventTypeReconnection: EventType = "reconnection";
export const EventTypeInactive: EventType = "inactive";
export const EventTypeGameHostChange: EventType = "host_change";

// Event types - Server → Client (new game flow events)
export const EventTypeTimer: EventType = "timer";
export const EventTypeTurn: EventType = "turn";
export const EventTypeVote: EventType = "vote";
export const EventTypeDay: EventType = "day";
export const EventTypeNight: EventType = "night";
export const EventTypeDeath: EventType = "death";
export const EventTypeWin: EventType = "win";
export const EventTypeRoleReveal: EventType = "role_reveal";
export const EventTypeSeerReveal: EventType = "seer_reveal";

// Event types - Server → Client (error and ack)
export const EventTypeError: EventType = "error";
export const EventTypeAck: EventType = "ack";

// Event types - Client → Server (actions)
export const EventTypeStartGame: EventType = "start_game";
export const EventTypeVillageVote: EventType = "village_vote";
export const EventTypeSeerAction: EventType = "seer_action";
export const EventTypeWerewolfVote: EventType = "werewolf_vote";
export const EventTypeWitchAction: EventType = "witch_action";

// Generic Event interface
export interface Event<T> {
    channel: EventChannel;
    type: EventType;
    data: T;
}

// ========================
// EXISTING DATA INTERFACES
// ========================

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
    connection_state: ConnectionState;
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

// Interface ConnectionEvent
export interface ConnectionEvent {
    player: PlayerID;
}

// Interface DisconnectionEvent
export interface DisconnectionEvent {
    player: PlayerID;
}

// Interface ReconnectionEventData
export interface ReconnectionEventData {
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

// ========================
// NEW GAME FLOW INTERFACES
// ========================

// Timer event data (server → client)
export type TimerStatus = 'started' | 'tick' | 'expired' | 'skipped';

export interface TimerEventData {
    phase: GamePhase;
    roleType?: RoleType;  // For night phase, which role's turn
    duration: number;     // Total duration in seconds
    remaining: number;    // Remaining time in seconds
    status: TimerStatus;
}

// Turn event data (server → client) - Night phase turns
export interface TurnEventData {
    roleType: RoleType;              // Which role should act
    targetPlayerId?: PlayerID;       // For witch: who the werewolves attacked
    canHeal?: boolean;               // For witch: can she heal?
    canPoison?: boolean;             // For witch: can she poison?
}

// Vote event data (server → client)
export type VoteEventType = 'start' | 'player' | 'end';

export interface VoteEventData {
    type: VoteEventType;
    player?: PlayerID;   // Who voted (for 'player' type)
    target?: PlayerID;   // Who was voted for / eliminated
}

// Day event data (server → client)
// Note: Deaths are now sent as individual DeathEvent before this event
export interface DayEventData {
    day: number;  // Current day number
}

// Night event data (server → client)
export interface NightEventData {
    // Empty - just a phase transition signal
}

// Death event data (server → client)
// Role is revealed when a player dies
export interface DeathEventData {
    victim: PlayerID;
    role: RoleType;
}

// Win event data (server → client)
export interface WinEventData {
    winningClan: Clan;
    winners: PlayerID[];
}

// Role reveal event data (server → client) - For seer
export interface RoleRevealEventData {
    role: RoleType;
}

// Seer reveal event data (server → client)
export interface SeerRevealEventData {
    targetId: PlayerID;
    roleType: RoleType;
}

// ========================
// ERROR AND ACK INTERFACES
// ========================

// Error codes from backend
export type ErrorCode =
    | 'WRONG_PHASE'
    | 'NOT_YOUR_TURN'
    | 'ALREADY_ACTED'
    | 'GAME_NOT_ACTIVE'
    | 'PLAYER_DEAD'
    | 'WRONG_ROLE'
    | 'INVALID_TARGET'
    | 'TARGET_DEAD'
    | 'CANNOT_TARGET_SELF'
    | 'ABILITY_USED'
    | 'CAN_ONLY_HEAL_VICTIM'
    | 'VOTE_NOT_FOUND'
    | 'VOTE_NOT_ACTIVE'
    | 'INVALID_VOTER'
    | 'INVALID_ACTION'
    | 'UNKNOWN_ERROR';

// Error event data (server → client)
export interface ErrorEventData {
    code: ErrorCode;
    message: string;
    action?: string;  // The action that caused the error
}

// Ack event data (server → client)
export interface AckEventData {
    action: string;
    success: boolean;
    message?: string;
}

// ========================
// ACTION INTERFACES (Client → Server)
// ========================

// Start game action (host only)
export interface StartGameActionData {
    // Empty - just triggers game start
}

// Village vote action
export interface VillageVoteActionData {
    targetId: PlayerID | null;  // null = abstain
}

// Seer action
export interface SeerActionData {
    targetId: PlayerID;
}

// Werewolf vote action
export interface WerewolfVoteActionData {
    targetId: PlayerID | null;  // null = abstain
}

// Witch action
export interface WitchActionData {
    healTargetId?: PlayerID;    // Who to save (optional)
    poisonTargetId?: PlayerID;  // Who to poison (optional)
}

// ========================
// TYPE ALIASES FOR EVENTS
// ========================

// Existing
export type GameSettingsEvent = Event<GameSettingsEventData>;
export type GameDataEvent = Event<GameDataEventData>;
export type ChatMessageEventType = Event<ChatMessageEvent>;
export type ConnectionEventType = Event<ConnectionEvent>;
export type DisconnectionEventType = Event<DisconnectionEvent>;
export type ReconnectionEvent = Event<ReconnectionEventData>;
export type InactiveEvent = Event<InactiveEventData>;
export type HostChangeEvent = Event<HostChangeEventData>;

// New game flow events
export type TimerEvent = Event<TimerEventData>;
export type TurnEvent = Event<TurnEventData>;
export type VoteEvent = Event<VoteEventData>;
export type DayEvent = Event<DayEventData>;
export type NightEvent = Event<NightEventData>;
export type DeathEvent = Event<DeathEventData>;
export type WinEvent = Event<WinEventData>;
export type RoleRevealEvent = Event<RoleRevealEventData>;
export type SeerRevealEvent = Event<SeerRevealEventData>;

// Action events
export type StartGameAction = Event<StartGameActionData>;
export type VillageVoteAction = Event<VillageVoteActionData>;
export type SeerAction = Event<SeerActionData>;
export type WerewolfVoteAction = Event<WerewolfVoteActionData>;
export type WitchAction = Event<WitchActionData>;

// Error and Ack events
export type ErrorEvent = Event<ErrorEventData>;
export type AckEvent = Event<AckEventData>;
