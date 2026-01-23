<script setup lang="ts">
import { computed } from 'vue'

export interface PixelModalProps {
    visible: boolean
    title?: string
    variant?: 'default' | 'danger' | 'success' | 'warning' | 'purple' | 'blue' | 'green' | 'pink'
    size?: 'sm' | 'md' | 'lg'
    closable?: boolean
    showHeader?: boolean
}

const props = withDefaults(defineProps<PixelModalProps>(), {
    title: '',
    variant: 'default',
    size: 'md',
    closable: true,
    showHeader: true,
})

const emit = defineEmits<{
    (e: 'close'): void
}>()

// Size classes
const sizeClasses = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'max-w-sm'
        case 'lg':
            return 'max-w-2xl'
        default:
            return 'max-w-lg'
    }
})

// Variant styles for header accent
const variantStyles = computed(() => {
    switch (props.variant) {
        case 'danger':
            return {
                headerBg: 'bg-red-900',
                headerText: 'text-red-200',
                accentColor: 'bg-red-500',
            }
        case 'success':
            return {
                headerBg: 'bg-green-900',
                headerText: 'text-green-200',
                accentColor: 'bg-green-500',
            }
        case 'warning':
            return {
                headerBg: 'bg-yellow-900',
                headerText: 'text-yellow-200',
                accentColor: 'bg-yellow-500',
            }
        case 'purple':
            return {
                headerBg: 'bg-purple-900',
                headerText: 'text-purple-200',
                accentColor: 'bg-purple-500',
            }
        case 'blue':
            return {
                headerBg: 'bg-blue-900',
                headerText: 'text-blue-200',
                accentColor: 'bg-blue-500',
            }
        case 'green':
            return {
                headerBg: 'bg-green-900',
                headerText: 'text-green-200',
                accentColor: 'bg-green-500',
            }
        case 'pink':
            return {
                headerBg: 'bg-pink-900',
                headerText: 'text-pink-200',
                accentColor: 'bg-pink-500',
            }
        default:
            return {
                headerBg: 'bg-[#0f0518]',
                headerText: 'text-purple-400',
                accentColor: 'bg-purple-500',
            }
    }
})

function handleClose() {
    if (props.closable) {
        emit('close')
    }
}

function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget && props.closable) {
        emit('close')
    }
}
</script>

<template>
    <Teleport to="body">
        <Transition name="pixel-modal">
            <div 
                v-if="visible" 
                class="pixel-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 font-['VT323']"
                @click="handleOverlayClick"
            >
                <div 
                    class="pixel-modal-content w-full"
                    :class="sizeClasses"
                >
                    <!-- Header (Windows 95 style title bar) -->
                    <div 
                        v-if="showHeader"
                        class="pixel-modal-header flex items-center justify-between px-3 py-2"
                        :class="variantStyles.headerBg"
                    >
                        <span 
                            class="text-xl tracking-wider uppercase"
                            :class="variantStyles.headerText"
                        >
                            {{ title || 'MODAL.EXE' }}
                        </span>
                        <div class="flex gap-1.5">
                            <!-- Decorative dots -->
                            <div class="h-3 w-3" :class="variantStyles.accentColor"></div>
                            <!-- Close button -->
                            <button 
                                v-if="closable"
                                @click="handleClose"
                                class="h-3 w-3 bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center group"
                                aria-label="Fermer"
                            >
                            </button>
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="pixel-modal-body bg-[#241a3e] px-6 py-6">
                        <slot></slot>
                    </div>

                    <!-- Footer (optional) -->
                    <div 
                        v-if="$slots.footer" 
                        class="pixel-modal-footer bg-[#1e1b29] px-6 py-4 border-t-2 border-[#584c75]"
                    >
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
/* CSS Variables */
.pixel-modal-overlay {
    --color-night-dark: #0f0518;
    --color-night-light: #241a3e;
    --color-border-light: #584c75;
    --color-border-dark: #08020d;
    
    background-color: rgba(0, 0, 0, 0.85);
    background-image: radial-gradient(rgba(36, 26, 62, 0.3) 1px, transparent 1px);
    background-size: 4px 4px;
}

/* Pixel card style */
.pixel-modal-content {
    background-color: var(--color-night-light);
    border: 4px solid;
    border-color: var(--color-border-light) var(--color-border-dark) var(--color-border-dark) var(--color-border-light);
    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.6);
}

.pixel-modal-header {
    border-bottom: 2px solid var(--color-border-dark);
}

/* Transition animations */
.pixel-modal-enter-active,
.pixel-modal-leave-active {
    transition: all 0.2s ease-out;
}

.pixel-modal-enter-from,
.pixel-modal-leave-to {
    opacity: 0;
}

.pixel-modal-enter-from .pixel-modal-content,
.pixel-modal-leave-to .pixel-modal-content {
    transform: scale(0.95) translateY(-10px);
}

.pixel-modal-enter-active .pixel-modal-content,
.pixel-modal-leave-active .pixel-modal-content {
    transition: transform 0.2s ease-out;
}
</style>
