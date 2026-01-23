<script setup lang="ts">
import { computed } from 'vue'

export interface PixelButtonProps {
    variant?: 'primary' | 'secondary' | 'danger' | 'success'
    size?: 'sm' | 'md' | 'lg'
    disabled?: boolean
    loading?: boolean
    fullWidth?: boolean
}

const props = withDefaults(defineProps<PixelButtonProps>(), {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    fullWidth: false,
})

const emit = defineEmits<{
    (e: 'click', event: MouseEvent): void
}>()

const sizeClasses = computed(() => {
    switch (props.size) {
        case 'sm':
            return 'px-3 py-1 text-lg'
        case 'lg':
            return 'px-8 py-4 text-3xl'
        default:
            return 'px-6 py-2 text-2xl'
    }
})

const variantClasses = computed(() => {
    switch (props.variant) {
        case 'secondary':
            return 'btn-pixel-secondary'
        case 'danger':
            return 'btn-pixel-danger'
        case 'success':
            return 'btn-pixel-success'
        default:
            return 'btn-pixel-primary'
    }
})

function handleClick(e: MouseEvent) {
    if (!props.disabled && !props.loading) {
        emit('click', e)
    }
}
</script>

<template>
    <button
        :class="[
            variantClasses,
            sizeClasses,
            {
                'w-full': fullWidth,
                'opacity-50 cursor-not-allowed': disabled || loading,
            }
        ]"
        :disabled="disabled || loading"
        @click="handleClick"
        class="font-['VT323'] uppercase tracking-wider transition-transform"
    >
        <span v-if="loading" class="inline-flex items-center gap-2">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <slot>Chargement...</slot>
        </span>
        <slot v-else></slot>
    </button>
</template>

<style scoped>
/* Primary Button (Red) */
.btn-pixel-primary {
    background-color: #dc2626;
    color: white;
    border-top: 2px solid #ff8888;
    border-left: 2px solid #ff8888;
    border-right: 2px solid #991b1b;
    border-bottom: 2px solid #991b1b;
    box-shadow: 0 4px 0 #08020d;
}

.btn-pixel-primary:not(:disabled):active {
    transform: translateY(4px);
    box-shadow: 0 0 0 #08020d;
}

.btn-pixel-primary:not(:disabled):hover {
    filter: brightness(1.1);
}

/* Secondary Button (Dark Purple) */
.btn-pixel-secondary {
    background-color: #1e1b29;
    color: #e2e8f0;
    border-top: 2px solid #584c75;
    border-left: 2px solid #584c75;
    border-right: 2px solid #08020d;
    border-bottom: 2px solid #08020d;
    box-shadow: 0 4px 0 #08020d;
}

.btn-pixel-secondary:not(:disabled):active {
    transform: translateY(4px);
    box-shadow: 0 0 0 #08020d;
}

.btn-pixel-secondary:not(:disabled):hover {
    background-color: #2d2640;
}

/* Danger Button (Dark Red) */
.btn-pixel-danger {
    background-color: #7f1d1d;
    color: #fecaca;
    border-top: 2px solid #dc2626;
    border-left: 2px solid #dc2626;
    border-right: 2px solid #450a0a;
    border-bottom: 2px solid #450a0a;
    box-shadow: 0 4px 0 #08020d;
}

.btn-pixel-danger:not(:disabled):active {
    transform: translateY(4px);
    box-shadow: 0 0 0 #08020d;
}

.btn-pixel-danger:not(:disabled):hover {
    background-color: #991b1b;
}

/* Success Button (Green) */
.btn-pixel-success {
    background-color: #166534;
    color: #bbf7d0;
    border-top: 2px solid #22c55e;
    border-left: 2px solid #22c55e;
    border-right: 2px solid #14532d;
    border-bottom: 2px solid #14532d;
    box-shadow: 0 4px 0 #08020d;
}

.btn-pixel-success:not(:disabled):active {
    transform: translateY(4px);
    box-shadow: 0 0 0 #08020d;
}

.btn-pixel-success:not(:disabled):hover {
    background-color: #15803d;
}
</style>
