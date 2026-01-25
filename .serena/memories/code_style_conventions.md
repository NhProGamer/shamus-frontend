# Style et conventions de code - Shamus Frontend

## Vue Components

### Structure des fichiers .vue
- Utilisation de `<script setup lang="ts">` (Composition API)
- Ordre des sections : `<script setup>`, `<template>`, `<style>`

### Exemple
```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
// imports...

// state
const myState = ref<string>('')

// computed
const myComputed = computed(() => ...)
</script>

<template>
  <!-- template -->
</template>

<style>
/* styles scoped ou globaux */
</style>
```

## TypeScript

### Conventions de nommage
- **Types/Interfaces** : PascalCase (`GameDataEventData`, `PlayerID`)
- **Fonctions** : camelCase (`handleGameData`, `setCurrentUserId`)
- **Constantes d'événements** : PascalCase avec préfixe (`EventTypeGameData`)
- **Variables** : camelCase (`currentUserId`, `voteState`)
- **Fichiers** : camelCase pour les composables (`useWebSocket.ts`), PascalCase pour les composants Vue (`GameView.vue`)

### Types
- Utilisation extensive des types stricts
- Types d'alias pour les IDs : `type PlayerID = string`, `type GameID = string`
- Records pour les mappings : `Record<RoleType, number>`
- Interfaces pour les objets complexes

### Imports
- Alias `@/` pour le dossier `src/`
- Imports de types avec `import type { ... }`

## Pinia Stores

### Structure (Composition API style)
```typescript
export const useGameStore = defineStore('game', () => {
    // STATE (ref)
    const myState = ref<Type>(initialValue)
    
    // COMPUTED
    const myComputed = computed(() => ...)
    
    // ACTIONS
    function myAction() { ... }
    
    return {
        // state, computed, actions
    }
})
```

## Composables

### Convention de nommage
- Préfixe `use` : `useWebSocket`, `useGameEvents`
- Retourne un objet avec les propriétés/méthodes exposées

### Structure type
```typescript
export interface UseXxxReturn {
    // types de retour
}

export function useXxx(params): UseXxxReturn {
    // implémentation
    return { ... }
}
```

## CSS / Tailwind

### Style général
- Tailwind CSS 4 pour le styling
- Classes utilitaires inline dans les templates
- Thème sombre avec couleurs violettes (`bg-[#0f0518]`, `text-purple-300`)
- Police rétro : VT323 (Google Fonts)
- Style pixel art / rétro gaming

### Animations
- Transitions Vue avec `<Transition name="fade">`
- Classes Tailwind pour animations (`animate-pulse`)

## Commentaires
- Commentaires en français ou anglais selon le contexte
- JSDoc pour les fonctions/interfaces complexes
- Section markers : `// ========================`
