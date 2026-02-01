/**
 * Composable for managing player actions with client-side timers
 * Handles action lifecycle: created → pending → completed/expired
 */

import { ref, computed, onUnmounted } from 'vue'
import type { 
  ActionCreatedEventData, 
  ActionExpiredEventData,
  ActionState,
  ActionType,
  ActionID
} from '@/types/actions'

// Global timer interval ID (shared across all useActions instances)
let globalTimerInterval: number | null = null
let globalTimerInstanceCount = 0

export function useActions() {
  // ============================================================================
  // State
  // ============================================================================

  /** Map of action ID to action state */
  const actions = ref<Map<ActionID, ActionState>>(new Map())

  // ============================================================================
  // Computed
  // ============================================================================

  /** Check if any action is currently active (pending) */
  const hasActiveAction = computed(() => {
    return Array.from(actions.value.values()).some(
      action => action.status === 'pending' && action.remainingSeconds > 0
    )
  })

  /** Get all pending actions (not expired) */
  const activeActions = computed(() => {
    return Array.from(actions.value.values()).filter(
      action => action.status === 'pending' && action.remainingSeconds > 0
    )
  })

  /** Get pending action by type (returns first match) */
  const getPendingActionByType = (type: ActionType): ActionState | null => {
    return activeActions.value.find(action => action.type === type) || null
  }

  /** Get action by ID */
  const getAction = (actionId: ActionID): ActionState | null => {
    return actions.value.get(actionId) || null
  }

  // ============================================================================
  // Timer Management
  // ============================================================================

  /**
   * Start the global timer if not already running
   * Decrements remainingSeconds for all pending actions every second
   */
  const startGlobalTimer = () => {
    if (globalTimerInterval !== null) {
      return // Timer already running
    }

    console.log('[useActions] Starting global timer')
    
    globalTimerInterval = window.setInterval(() => {
      // Iterate through all actions and decrement remaining time
      actions.value.forEach((action, actionId) => {
        if (action.status === 'pending' && action.remainingSeconds > 0) {
          action.remainingSeconds--
          
          // Auto-expire if time runs out (client-side)
          if (action.remainingSeconds <= 0) {
            console.log(`[useActions] Action ${actionId} expired (client-side timeout)`)
            action.status = 'expired'
          }
        }
      })
    }, 1000) // Every second
  }

  /**
   * Stop the global timer if no instances are using it
   */
  const stopGlobalTimer = () => {
    globalTimerInstanceCount--
    
    if (globalTimerInstanceCount === 0 && globalTimerInterval !== null) {
      console.log('[useActions] Stopping global timer')
      clearInterval(globalTimerInterval)
      globalTimerInterval = null
    }
  }

  // ============================================================================
  // Action Handlers
  // ============================================================================

  /**
   * Handle action_created event from server
   * Creates a new action and starts tracking it
   */
  const handleActionCreated = (event: ActionCreatedEventData) => {
    const { actionId, type, payload, expiresAt, timeout } = event

    console.log(`[useActions] Action created: ${actionId} (type: ${type}, timeout: ${timeout}s)`)

    // Create action state
    const actionState: ActionState = {
      actionId,
      type,
      payload,
      expiresAt: new Date(expiresAt),
      timeoutSeconds: timeout,
      remainingSeconds: timeout,
      status: 'pending',
    }

    // Add to map
    actions.value.set(actionId, actionState)

    // Start timer if needed
    startGlobalTimer()

    return actionState
  }

  /**
   * Handle action_expired event from server
   * Marks the action as expired
   */
  const handleActionExpired = (event: ActionExpiredEventData) => {
    const { actionId, type } = event

    console.log(`[useActions] Action expired (server): ${actionId} (type: ${type})`)

    const action = actions.value.get(actionId)
    if (action) {
      action.status = 'expired'
      action.remainingSeconds = 0
    }
  }

  /**
   * Mark an action as completed (when response is sent)
   * @param actionId - The action ID
   * @param response - The response data (optional, for tracking)
   */
  const markActionCompleted = (actionId: ActionID, response?: any) => {
    console.log(`[useActions] Action completed: ${actionId}`)

    const action = actions.value.get(actionId)
    if (action) {
      action.status = 'completed'
      action.response = response
    }
  }

  /**
   * Clear a specific action from the map
   */
  const clearAction = (actionId: ActionID) => {
    console.log(`[useActions] Clearing action: ${actionId}`)
    actions.value.delete(actionId)
  }

  /**
   * Clear all actions
   */
  const clearAllActions = () => {
    console.log('[useActions] Clearing all actions')
    actions.value.clear()
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  // Increment instance count when composable is used
  globalTimerInstanceCount++
  startGlobalTimer()

  // Cleanup on unmount
  onUnmounted(() => {
    console.log('[useActions] Component unmounted, cleaning up')
    stopGlobalTimer()
  })

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    // State
    actions: computed(() => actions.value),
    
    // Computed
    hasActiveAction,
    activeActions,
    
    // Getters
    getAction,
    getPendingActionByType,
    
    // Handlers
    handleActionCreated,
    handleActionExpired,
    markActionCompleted,
    
    // Cleanup
    clearAction,
    clearAllActions,
  }
}
