import type { ErrorCode } from '@/types/events'

/**
 * Map of error codes to French user-friendly messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
    'WRONG_PHASE': "Ce n'est pas le bon moment pour cette action",
    'NOT_YOUR_TURN': "Ce n'est pas votre tour",
    'ALREADY_ACTED': "Vous avez deja agi cette phase",
    'GAME_NOT_ACTIVE': "La partie n'est pas en cours",
    'PLAYER_DEAD': "Les morts ne peuvent pas agir",
    'WRONG_ROLE': "Vous n'avez pas le role requis",
    'INVALID_TARGET': "Cible invalide",
    'TARGET_DEAD': "Cette cible est deja morte",
    'CANNOT_TARGET_SELF': "Vous ne pouvez pas vous cibler vous-meme",
    'ABILITY_USED': "Vous avez deja utilise cette capacite",
    'CAN_ONLY_HEAL_VICTIM': "Vous ne pouvez sauver que la victime des loups",
    'VOTE_NOT_FOUND': "Vote introuvable",
    'VOTE_NOT_ACTIVE': "Le vote n'est pas actif",
    'INVALID_VOTER': "Vous n'etes pas autorise a voter",
    'INVALID_ACTION': "Action invalide",
    'UNKNOWN_ERROR': "Une erreur inattendue s'est produite",
}

/**
 * Get a user-friendly French error message for an error code
 */
export function getErrorMessage(code: ErrorCode): string {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES['UNKNOWN_ERROR']
}

/**
 * Map of action names to French display names
 */
const ACTION_NAMES: Record<string, string> = {
    'village_vote': 'Vote du village',
    'werewolf_vote': 'Vote des loups',
    'seer_action': 'Vision de la voyante',
    'witch_action': 'Action de la sorciere',
    'start_game': 'Lancement de la partie',
    'chat_message': 'Message de chat',
    'game_settings': 'Parametres de jeu',
}

/**
 * Get a user-friendly French name for an action
 */
export function getActionName(action: string): string {
    return ACTION_NAMES[action] || action
}
