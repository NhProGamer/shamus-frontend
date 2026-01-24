/**
 * useGameSettings Composable
 * 
 * Manages game settings (role configuration) with debounced updates to the server.
 * Provides optimistic UI updates and rollback on errors.
 */

import { ref, type Ref } from 'vue'
import type { RoleType, GameSettingsEventData, GameDataEventData, Event } from '@/types'
import { EventChannelSettings, EventTypeGameSettings } from '@/types/events'

const SETTINGS_DEBOUNCE_DELAY = 300 // ms

export interface UseGameSettingsOptions {
  onSend: (message: string) => void
  onError?: (message: string) => void
  onUpdateGameData?: (data: GameDataEventData) => void
}

export interface UseGameSettingsReturn {
  pendingRoles: Ref<Record<RoleType, number> | null>
  lastConfirmedRoles: Ref<Record<RoleType, number> | null>
  settingsError: Ref<string | null>
  updateRoleCount: (roleType: RoleType, delta: number, currentSettings: GameDataEventData) => void
  handleGameData: (data: GameDataEventData) => void
  handleSettingsUpdate: (data: GameSettingsEventData, currentGame: GameDataEventData | null) => void
  showSettingsError: (message: string, currentSettings: GameDataEventData | null) => void
  clearPendingSettings: () => void
}

/**
 * Composable for managing game settings with debounced server updates
 */
export function useGameSettings(options: UseGameSettingsOptions): UseGameSettingsReturn {
  const { onSend, onError, onUpdateGameData } = options

  // State
  const pendingRoles = ref<Record<RoleType, number> | null>(null)
  const lastConfirmedRoles = ref<Record<RoleType, number> | null>(null)
  const settingsError = ref<string | null>(null)

  // Timers (not reactive)
  let settingsDebounceTimeout: ReturnType<typeof setTimeout> | null = null
  let settingsErrorTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Send pending settings to server
   */
  function sendPendingSettings(): void {
    if (!pendingRoles.value) return

    const event: Event<GameSettingsEventData> = {
      channel: EventChannelSettings,
      type: EventTypeGameSettings,
      data: { roles: pendingRoles.value },
    }

    try {
      onSend(JSON.stringify(event))
    } catch (e) {
      console.error('Error sending settings:', e)
      onError?.('Erreur lors de la mise à jour des paramètres.')
    }

    pendingRoles.value = null
  }

  /**
   * Update role count with debounced server sync
   * Provides optimistic UI update
   */
  function updateRoleCount(
    roleType: RoleType,
    delta: number,
    currentSettings: GameDataEventData
  ): void {
    if (!currentSettings?.settings?.roles) return

    // Use pending roles if they exist, otherwise use current roles
    const baseRoles = pendingRoles.value || { ...currentSettings.settings.roles }
    const currentCount = baseRoles[roleType] || 0
    const newCount = Math.max(0, currentCount + delta)

    // Immediate local update for instant feedback
    const newRoles = { ...baseRoles, [roleType]: newCount }
    pendingRoles.value = newRoles

    // Apply to local state for immediate display
    if (onUpdateGameData) {
      onUpdateGameData({
        ...currentSettings,
        settings: { roles: newRoles },
      })
    }

    // Debounce: cancel previous timeout and create new one
    if (settingsDebounceTimeout) clearTimeout(settingsDebounceTimeout)
    settingsDebounceTimeout = setTimeout(sendPendingSettings, SETTINGS_DEBOUNCE_DELAY)
  }

  /**
   * Handle game data update - save confirmed roles for potential rollback
   */
  function handleGameData(data: GameDataEventData): void {
    if (data.settings?.roles) {
      lastConfirmedRoles.value = { ...data.settings.roles }
    }
  }

  /**
   * Handle settings update from server - confirm changes
   */
  function handleSettingsUpdate(
    data: GameSettingsEventData,
    currentGame: GameDataEventData | null
  ): void {
    if (currentGame && onUpdateGameData) {
      // Update store via callback
      onUpdateGameData({
        ...currentGame,
        settings: { roles: data.roles },
      })

      // Save server-confirmed state for potential rollback
      lastConfirmedRoles.value = { ...data.roles }
      pendingRoles.value = null
    }
  }

  /**
   * Display temporary error in UI and rollback changes
   */
  function showSettingsError(message: string, currentSettings: GameDataEventData | null): void {
    settingsError.value = message

    // Cancel any pending send
    if (settingsDebounceTimeout) {
      clearTimeout(settingsDebounceTimeout)
      settingsDebounceTimeout = null
    }
    pendingRoles.value = null

    // Rollback to last server-confirmed state
    if (lastConfirmedRoles.value && currentSettings && onUpdateGameData) {
      onUpdateGameData({
        ...currentSettings,
        settings: { roles: { ...lastConfirmedRoles.value } },
      })
    }

    // Clear error after 5 seconds
    if (settingsErrorTimeout) clearTimeout(settingsErrorTimeout)
    settingsErrorTimeout = setTimeout(() => {
      settingsError.value = null
    }, 5000)

    // Call error callback
    onError?.(message)
  }

  /**
   * Clear pending settings (useful on component unmount)
   */
  function clearPendingSettings(): void {
    if (settingsDebounceTimeout) {
      clearTimeout(settingsDebounceTimeout)
      settingsDebounceTimeout = null
    }
    if (settingsErrorTimeout) {
      clearTimeout(settingsErrorTimeout)
      settingsErrorTimeout = null
    }
    pendingRoles.value = null
  }

  return {
    pendingRoles,
    lastConfirmedRoles,
    settingsError,
    updateRoleCount,
    handleGameData,
    handleSettingsUpdate,
    showSettingsError,
    clearPendingSettings,
  }
}
