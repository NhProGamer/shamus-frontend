/**
 * Action System Types
 * Maps to backend: internal/domain/entities/action.go and actions/
 */

import type { PlayerID } from './player'

// ============================================================================
// Core Action Types
// ============================================================================

/** Unique identifier for an action */
export type ActionID = string

/** Type of action a player can perform */
export type ActionType = 
  | 'seer_vision'
  | 'werewolf_vote'
  | 'witch_potion'
  | 'village_vote'

/** Status of an action's lifecycle */
export type ActionStatus = 
  | 'pending'
  | 'completed'
  | 'expired'
  | 'cancelled'

// ============================================================================
// Action Event Data (Server → Client)
// ============================================================================

/**
 * Event sent when a new action is created for a player
 * Maps to: internal/domain/entities/events/action.go - ActionCreatedEventData
 */
export interface ActionCreatedEventData {
  actionId: string
  type: ActionType
  payload: ActionPayload
  expiresAt: string // ISO 8601 timestamp
  timeout: number // Timeout in seconds for UI display
}

/**
 * Event sent when an action times out
 * Maps to: internal/domain/entities/events/action.go - ActionExpiredEventData
 */
export interface ActionExpiredEventData {
  actionId: string
  type: ActionType
}

// ============================================================================
// Action Payloads (Server → Client)
// ============================================================================

/**
 * Payload for Seer vision action
 * Maps to: internal/domain/entities/actions/payloads.go - SeerVisionPayload
 */
export interface SeerVisionPayload {
  eligibleTargets: PlayerID[]
}

/**
 * Payload for Werewolf vote action
 * Maps to: internal/domain/entities/actions/payloads.go - WerewolfVotePayload
 */
export interface WerewolfVotePayload {
  eligibleTargets: PlayerID[]
}

/**
 * Payload for Witch potion action
 * Maps to: internal/domain/entities/actions/payloads.go - WitchPotionPayload
 */
export interface WitchPotionPayload {
  victimId?: PlayerID | null // Player killed by werewolves (null if none)
  hasHealPotion: boolean // Can the witch still heal?
  hasPoisonPotion: boolean // Can the witch still poison?
}

/**
 * Payload for Village vote action
 * Maps to: internal/domain/entities/actions/payloads.go - VillageVotePayload
 */
export interface VillageVotePayload {
  eligibleTargets: PlayerID[]
}

/**
 * Union type for all possible action payloads
 */
export type ActionPayload =
  | SeerVisionPayload
  | WerewolfVotePayload
  | WitchPotionPayload
  | VillageVotePayload

// ============================================================================
// Action Responses (Client → Server)
// ============================================================================

/**
 * Response for Seer vision action
 * Maps to: internal/domain/entities/actions/responses.go - SeerVisionResponse
 */
export interface SeerVisionResponse {
  targetId: PlayerID
}

/**
 * Response for Werewolf vote action
 * Maps to: internal/domain/entities/actions/responses.go - WerewolfVoteResponse
 */
export interface WerewolfVoteResponse {
  targetId?: PlayerID | null // null to abstain
}

/**
 * Response for Witch potion action
 * Maps to: internal/domain/entities/actions/responses.go - WitchPotionResponse
 */
export interface WitchPotionResponse {
  healTargetId?: PlayerID | null // Player to heal (must be victim)
  poisonTargetId?: PlayerID | null // Player to poison
}

/**
 * Response for Village vote action
 * Maps to: internal/domain/entities/actions/responses.go - VillageVoteResponse
 */
export interface VillageVoteResponse {
  targetId?: PlayerID | null // null to abstain
}

/**
 * Union type for all possible action responses
 */
export type ActionResponse =
  | SeerVisionResponse
  | WerewolfVoteResponse
  | WitchPotionResponse
  | VillageVoteResponse

// ============================================================================
// Action Response Event Data (Client → Server)
// ============================================================================

/**
 * Event sent by client to respond to an action
 * Maps to: internal/domain/entities/events/action.go - ActionResponseEventData
 */
export interface ActionResponseEventData {
  actionId: string
  response: ActionResponse
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Typed action created event for type-safe payload access
 */
export type TypedActionCreatedEvent<T extends ActionType> = 
  T extends 'seer_vision' ? ActionCreatedEventData & { payload: SeerVisionPayload } :
  T extends 'werewolf_vote' ? ActionCreatedEventData & { payload: WerewolfVotePayload } :
  T extends 'witch_potion' ? ActionCreatedEventData & { payload: WitchPotionPayload } :
  T extends 'village_vote' ? ActionCreatedEventData & { payload: VillageVotePayload } :
  never

/**
 * Client-side action state (for tracking in useActions composable)
 */
export interface ActionState {
  actionId: string
  type: ActionType
  payload: ActionPayload
  expiresAt: Date
  timeoutSeconds: number
  remainingSeconds: number
  status: ActionStatus
  response?: ActionResponse
}
