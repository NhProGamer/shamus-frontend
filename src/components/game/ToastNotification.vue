<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useNotificationStore, type NotificationType } from '@/stores/notificationStore'

const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)
const { removeNotification } = notificationStore

// Icon and color config per notification type
const typeConfig: Record<NotificationType, { icon: string; bgClass: string; borderClass: string; textClass: string }> = {
    error: {
        icon: '✕',
        bgClass: 'bg-red-900/90',
        borderClass: 'border-red-500',
        textClass: 'text-red-200',
    },
    success: {
        icon: '✓',
        bgClass: 'bg-green-900/90',
        borderClass: 'border-green-500',
        textClass: 'text-green-200',
    },
    warning: {
        icon: '⚠',
        bgClass: 'bg-yellow-900/90',
        borderClass: 'border-yellow-500',
        textClass: 'text-yellow-200',
    },
    info: {
        icon: 'ℹ',
        bgClass: 'bg-blue-900/90',
        borderClass: 'border-blue-500',
        textClass: 'text-blue-200',
    },
}

function getConfig(type: NotificationType) {
    return typeConfig[type] || typeConfig.info
}

function handleClose(id: string) {
    removeNotification(id)
}
</script>

<template>
    <Teleport to="body">
        <div class="toast-container fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm">
            <TransitionGroup name="toast">
                <div
                    v-for="notification in notifications"
                    :key="notification.id"
                    class="toast-item flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg backdrop-blur-sm"
                    :class="[getConfig(notification.type).bgClass, getConfig(notification.type).borderClass]"
                >
                    <!-- Icon -->
                    <div 
                        class="toast-icon flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                        :class="getConfig(notification.type).textClass"
                    >
                        {{ getConfig(notification.type).icon }}
                    </div>
                    
                    <!-- Message -->
                    <div class="toast-content flex-grow min-w-0">
                        <p 
                            class="text-sm font-medium break-words"
                            :class="getConfig(notification.type).textClass"
                        >
                            {{ notification.message }}
                        </p>
                    </div>
                    
                    <!-- Close button -->
                    <button
                        @click="handleClose(notification.id)"
                        class="toast-close flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
                        :class="getConfig(notification.type).textClass"
                    >
                        <span class="text-lg leading-none">&times;</span>
                    </button>
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<style scoped>
.toast-container {
    pointer-events: none;
}

.toast-item {
    pointer-events: auto;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 0, 0, 0.2);
}

/* Transition animations */
.toast-enter-active {
    transition: all 0.3s ease-out;
}

.toast-leave-active {
    transition: all 0.2s ease-in;
}

.toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.toast-leave-to {
    opacity: 0;
    transform: translateX(100%);
}

.toast-move {
    transition: transform 0.3s ease;
}
</style>
