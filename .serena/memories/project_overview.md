# Shamus Frontend - Vue d'ensemble du projet

## Description
**Shamus** est une application web de jeu de type "Loup-Garou" (Werewolf) avec une interface rétro/pixel art.

## Fonctionnalités principales
- Authentification OIDC (OpenID Connect) via `oidc-client-ts`
- Création et gestion de parties de jeu
- Communication temps réel via WebSocket
- Système de rôles (voyante/seer, loup-garou/werewolf, sorcière/witch, villageois)
- Phases de jeu : jour, nuit, vote
- Chat en temps réel

## Stack technique
- **Framework** : Vue 3 (Composition API avec `<script setup>`)
- **Build Tool** : Vite 7
- **Langage** : TypeScript 5.9
- **State Management** : Pinia 3
- **Router** : Vue Router 4
- **CSS** : Tailwind CSS 4
- **HTTP Client** : Axios
- **Auth** : oidc-client-ts 3
- **Package Manager** : pnpm

## Architecture
```
src/
├── assets/          # CSS global (main.css, base.css)
├── components/      # Composants réutilisables
│   ├── game/       # Composants spécifiques au jeu
│   ├── icons/      # Icônes SVG
│   └── ui/         # Composants UI génériques (PixelButton, PixelModal)
├── composables/     # Hooks Vue (useWebSocket, useGameEvents, etc.)
├── router/          # Configuration Vue Router
├── services/        # Services API (axios)
├── stores/          # Stores Pinia (gameStore, notificationStore)
├── types/           # Types TypeScript
├── utils/           # Utilitaires
└── views/           # Pages/Vues
```

## Environnement requis
- Node.js ^20.19.0 ou >=22.12.0
- pnpm (workspace configuré)

## Backend
- API REST : `VITE_API_URL` (défaut: http://localhost:8080)
- Endpoints : `/app/api/v1/game`
- WebSocket pour les événements temps réel
- Auth Server : https://auth-shamus.nhsoul.fr/oidc
