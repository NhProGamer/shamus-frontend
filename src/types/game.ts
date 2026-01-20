import type {RoleType} from "@/types/roles.ts";
import type {PlayerID} from "@/types/player.ts";

export type GameID = string;
export type GamePhase = 'start' | 'day' | 'night' | 'vote'
export type GameStatus = 'waiting' | 'started' | 'ended'

export interface GameSettings {
    roles: Map<RoleType, number>
}

export interface Game {
    id: GameID
    status: GameStatus
    phase: GamePhase
    day: number
    players: Array<PlayerID>
    hostID : PlayerID
    settings: GameSettings
}
