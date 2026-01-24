import type {RoleType} from "@/types/roles"
import type {PlayerID} from "@/types/player"
import type {GameSettings} from "@/types/events"

export type GameID = string;
export type GamePhase = 'start' | 'day' | 'night' | 'vote'
export type GameStatus = 'waiting' | 'active' | 'ended'

// Note: GameSettings is defined in events.ts to match backend JSON structure
// It uses Record<RoleType, number> for proper JSON serialization

export interface Game {
    id: GameID
    status: GameStatus
    phase: GamePhase
    day: number
    players: Array<PlayerID>
    hostID : PlayerID
    settings: GameSettings
}
