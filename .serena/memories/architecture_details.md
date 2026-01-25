# Architecture détaillée - Shamus Frontend

## Flux de données

### Authentification (OIDC)
```
User → HomeView → userManager.signinRedirect() → Auth Server
Auth Server → /oidc-callback → Callback.vue → userManager.signinRedirectCallback()
```

### Communication temps réel (WebSocket)
```
Client ←→ WebSocket Server
  ├── game_event (événements de jeu)
  ├── conn_event (connexions/déconnexions)
  ├── settings_event (paramètres)
  └── timer_event (timers)
```

### API REST
```
Client → Axios (avec intercepteurs JWT) → Backend API
  └── /app/api/v1/game (CRUD parties)
```

## Composables clés

### `useWebSocket.ts`
- Gestion connexion WebSocket avec auto-reconnexion
- Parse JSON automatique des messages
- États : connecting, open, closing, closed, error

### `useGameEvents.ts`
- Gestion des événements de jeu entrants
- Dispatch vers le store Pinia

### `useGameWebSocket.ts`
- Connexion WebSocket spécifique au jeu
- Envoi des actions joueur

### `useGameChat.ts`
- Gestion du chat en jeu

### `useGameSettings.ts`
- Gestion des paramètres de partie

## Stores Pinia

### `gameStore.ts`
Store principal contenant :
- État de la partie (`game`, `timer`, `voteState`)
- État du joueur (`myRole`, `isAlive`)
- Actions (`handleGameData`, `handleVoteEvent`, etc.)
- Computed (`isHost`, `livingPlayers`, `eligibleTargets`)

### `notificationStore.ts`
- Gestion des notifications/toasts

## Types principaux

### Événements serveur → client
- `GameDataEventData` : état complet de la partie
- `TimerEventData` : timer de phase
- `TurnEventData` : tour de nuit (rôle actif)
- `VoteEventData` : événements de vote
- `DeathEventData` : mort d'un joueur
- `WinEventData` : fin de partie

### Actions client → serveur
- `StartGameActionData` : démarrer la partie
- `VillageVoteActionData` : vote du village
- `SeerActionData` : action de la voyante
- `WerewolfVoteActionData` : vote des loups
- `WitchActionData` : actions de la sorcière

## Vues principales

### `HomeView.vue`
- Page d'accueil avec login

### `PlayView.vue`
- Lobby de création/rejoindre partie

### `GameView.vue`
- Interface de jeu principale

### `Callback.vue`
- Gestion du retour OIDC

## Composants de jeu (`/components/game/`)
- `TimerDisplay.vue` : affichage du timer
- `VotePanel.vue` : panneau de vote
- `NightActionModal.vue` : modal d'action nocturne
- `WinModal.vue` : modal de victoire
- `StartGameButton.vue` : bouton de démarrage
- `ToastNotification.vue` : notifications toast

## Composants UI (`/components/ui/`)
- `PixelButton.vue` : bouton style pixel art
- `PixelModal.vue` : modal style pixel art
