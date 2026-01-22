import { ref } from 'vue'
import { defineStore } from 'pinia'

export type NotificationType = 'error' | 'success' | 'warning' | 'info'

export interface Notification {
    id: string
    type: NotificationType
    message: string
    duration: number  // in ms
    createdAt: number
}

export const useNotificationStore = defineStore('notification', () => {
    // ========================
    // STATE
    // ========================
    
    const notifications = ref<Notification[]>([])
    
    // ========================
    // ACTIONS
    // ========================
    
    /**
     * Add a notification to the queue
     */
    function addNotification(
        type: NotificationType,
        message: string,
        duration: number = 5000
    ): string {
        const id = crypto.randomUUID()
        const notification: Notification = {
            id,
            type,
            message,
            duration,
            createdAt: Date.now(),
        }
        
        notifications.value.push(notification)
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id)
            }, duration)
        }
        
        return id
    }
    
    /**
     * Remove a notification by ID
     */
    function removeNotification(id: string): void {
        const index = notifications.value.findIndex(n => n.id === id)
        if (index !== -1) {
            notifications.value.splice(index, 1)
        }
    }
    
    /**
     * Clear all notifications
     */
    function clearAll(): void {
        notifications.value = []
    }
    
    // ========================
    // CONVENIENCE METHODS
    // ========================
    
    function showError(message: string, duration?: number): string {
        return addNotification('error', message, duration ?? 6000)
    }
    
    function showSuccess(message: string, duration?: number): string {
        return addNotification('success', message, duration ?? 3000)
    }
    
    function showWarning(message: string, duration?: number): string {
        return addNotification('warning', message, duration ?? 5000)
    }
    
    function showInfo(message: string, duration?: number): string {
        return addNotification('info', message, duration ?? 4000)
    }
    
    // ========================
    // RETURN
    // ========================
    
    return {
        // State
        notifications,
        
        // Actions
        addNotification,
        removeNotification,
        clearAll,
        
        // Convenience
        showError,
        showSuccess,
        showWarning,
        showInfo,
    }
})
