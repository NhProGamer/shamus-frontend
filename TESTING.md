# Action System Testing Guide

This document provides a comprehensive testing plan for the new Action System that replaced the old event-based game flow.

## Prerequisites

### Backend Setup
```bash
cd /var/home/nhpro/GolandProjects/shamus-backend
go run cmd/server/main.go
```

### Frontend Setup
```bash
cd /var/home/nhpro/WebstormProjects/shamus-frontend
pnpm dev
```

### Test Environment
- Minimum 4 players required (1 Seer, 2 Werewolves, 1 Villager)
- Recommended: 6-8 players for full role coverage
- Use multiple browsers/incognito windows for multi-player testing

## Action System Architecture

### New WebSocket Flow
```
Backend                          Frontend
--------                         --------
action_created event     →       gameStore.handleActionCreated()
                                 ├─ Add to pendingActions Map
                                 ├─ Start client-side timer
                                 └─ Show ActionModal

User interacts          →        ActionModal (dynamic component)
                                 ├─ SeerAction.vue
                                 ├─ WerewolfAction.vue
                                 ├─ WitchAction.vue
                                 └─ VillageAction.vue

Submit button           →        handleActionSubmit(actionId, response)
                                 └─ WebSocket.sendActionResponse()

action_response sent    →        Backend validates & processes

action_expired event    ←        Timeout reached (optional)
                                 └─ Clear action + notify user
```

### Action Types
1. **seer_vision** - Seer selects target, sees their role
2. **werewolf_vote** - Werewolves vote to kill a villager
3. **witch_potion** - Witch decides to heal victim or poison someone
4. **village_vote** - All alive players vote to eliminate someone

## Test Cases

### 1. Seer Vision (Night Phase)

**Setup**: Create game with Seer role assigned

**Test Steps**:
1. Start game, wait for night phase
2. **Expected**: Seer receives `action_created` with type `seer_vision`
3. **Expected**: ActionModal appears with purple theme
4. **Expected**: Player grid shows all alive players (excluding Seer)
5. **Action**: Click on a target player
6. **Expected**: "Confirm" button enables
7. **Action**: Click "Confirm"
8. **Expected**: Modal closes, action marked completed
9. **Expected**: Backend sends result (player's role revealed)
10. **Expected**: Timer stops, no timeout notification

**Edge Cases**:
- [ ] Cancel button clears selection
- [ ] Timer shows countdown (30s default)
- [ ] Timer turns red when <10s remaining
- [ ] Action expires if no response before timeout
- [ ] Notification shown on expiry
- [ ] Cannot submit if timer expired
- [ ] Selecting different targets updates selection
- [ ] Double-clicking target auto-submits

**Files to Monitor**:
- `src/components/game/actions/SeerAction.vue:1` - Component
- `src/stores/gameStore.ts:207` - handleActionCreated
- `src/views/GameView.vue:450` - WebSocket handler

---

### 2. Werewolf Vote (Night Phase)

**Setup**: Create game with 2+ Werewolves

**Test Steps**:
1. Start game, wait for night phase
2. **Expected**: All Werewolves receive `action_created` with type `werewolf_vote`
3. **Expected**: ActionModal appears with red theme
4. **Expected**: Player grid shows all alive non-werewolves
5. **Expected**: "Abstain" button available
6. **Action**: Werewolf 1 votes for Player A
7. **Action**: Werewolf 2 votes for Player A
8. **Expected**: Both modals close after submit
9. **Expected**: Backend tallies votes, kills Player A (if majority)
10. **Expected**: Timer synchronized across all Werewolves

**Edge Cases**:
- [ ] Werewolves can abstain from voting
- [ ] Votes are hidden from other Werewolves (privacy)
- [ ] Tie votes handled by backend rules
- [ ] All Werewolves must submit (or timeout) before phase ends
- [ ] Dead Werewolves don't receive action
- [ ] Single Werewolf can vote alone

**Files to Monitor**:
- `src/components/game/actions/WerewolfAction.vue:1` - Component
- `src/stores/gameStore.ts:207` - handleActionCreated

---

### 3. Witch Potion (Night Phase)

**Setup**: Create game with Witch role, ensure someone died during night

**Test Steps**:
1. Werewolves kill Player A
2. **Expected**: Witch receives `action_created` with type `witch_potion`
3. **Expected**: ActionModal appears with dual theme (green/purple)
4. **Expected**: "Heal" section shows victim's name (Player A)
5. **Expected**: "Poison" section shows player grid (alive players)
6. **Expected**: "Skip" button available
7. **Action**: Click "Heal Victim" (if heal potion available)
8. **Expected**: Confirm button enables
9. **Expected**: Submit → Player A survives
10. **Alternative**: Click player in poison grid → poisons that player

**Edge Cases**:
- [ ] Heal potion grayed out if already used
- [ ] Poison potion grayed out if already used
- [ ] Can skip without using any potion
- [ ] Cannot use both potions in same night
- [ ] Victim is null if no one died → only poison available
- [ ] Potions persist across nights until used
- [ ] Dead witch doesn't receive action

**Files to Monitor**:
- `src/components/game/actions/WitchAction.vue:1` - Component
- `src/types/actions.ts:95` - WitchPotionPayload type

---

### 4. Village Vote (Day Phase)

**Setup**: Any game state with alive players

**Test Steps**:
1. Day phase begins
2. **Expected**: All alive players receive `action_created` with type `village_vote`
3. **Expected**: ActionModal appears with blue theme
4. **Expected**: Player grid shows all alive players (excluding self)
5. **Expected**: "Abstain" button available
6. **Action**: Players vote for suspects
7. **Expected**: Each player can submit one vote
8. **Expected**: Backend tallies votes
9. **Expected**: Player with most votes is eliminated
10. **Expected**: Tie handling per backend rules

**Edge Cases**:
- [ ] All players can abstain
- [ ] Dead players don't receive action
- [ ] Votes are hidden until phase ends
- [ ] Self-voting prevented (not in grid)
- [ ] Majority vote required (or plurality)
- [ ] Timer synchronized across all players
- [ ] Late joiners handled gracefully

**Files to Monitor**:
- `src/components/game/actions/VillageAction.vue:1` - Component
- `src/stores/gameStore.ts:207` - handleActionCreated

---

## Timer System Tests

### Client-Side Timer Accuracy

**Test Steps**:
1. Receive action with 30s timeout
2. **Expected**: Timer counts down: 30, 29, 28...
3. **Expected**: Timer updates every second
4. **Expected**: Warning at <10s (red color, shake animation)
5. **Expected**: Auto-expire at 0s
6. **Expected**: Modal closes, notification shown
7. **Expected**: Action marked as expired in store

**Edge Cases**:
- [ ] Timer survives component re-renders
- [ ] Multiple actions have independent timers
- [ ] Timer cleanup on manual submit
- [ ] Timer cleanup on component unmount
- [ ] Timer drift correction (if backend sends updates)
- [ ] Negative time never shown

**Files to Monitor**:
- `src/composables/useActions.ts:78` - Timer implementation
- `src/stores/gameStore.ts:174` - Timer state

---

## Integration Tests

### Backward Compatibility

**Test Steps**:
1. Check old event handlers still present
2. **Expected**: `nightTurn` state still exists
3. **Expected**: `voteState` still exists
4. **Expected**: Old components render without errors
5. **Action**: Remove deprecated code after full migration

**Files to Check**:
- `src/views/GameView.vue:1` - OLD NightActionModal
- `src/components/game/VotePanel.vue:1` - OLD voting
- `src/composables/useGameWebSocket.ts:1` - @deprecated methods

---

### WebSocket Reliability

**Test Steps**:
1. Start action flow
2. **Action**: Disconnect WiFi mid-action
3. **Expected**: Connection lost notification
4. **Expected**: Timer pauses or continues client-side
5. **Action**: Reconnect before timeout
6. **Expected**: Action state syncs from server
7. **Expected**: Can still submit if time remains
8. **Alternative**: Timeout during disconnect
9. **Expected**: Backend expires action, frontend syncs on reconnect

**Files to Monitor**:
- `src/composables/useGameWebSocket.ts:150` - Reconnect logic
- `src/stores/gameStore.ts:232` - handleActionExpired

---

### Multi-Action Scenarios

**Test Steps**:
1. Create game with Seer + Werewolves + Witch
2. **Expected**: Night phase triggers 3 actions simultaneously
3. **Expected**: Each player sees only their action
4. **Expected**: ActionModal shows correct component per action type
5. **Expected**: Timers don't interfere with each other
6. **Expected**: All actions resolve independently
7. **Expected**: Phase doesn't end until all actions complete/expire

**Edge Cases**:
- [ ] Action order doesn't matter (parallel processing)
- [ ] One player timing out doesn't block others
- [ ] Store handles Map updates concurrently
- [ ] No race conditions on submit

---

## Performance Tests

### Large Player Count

**Setup**: 16+ players in game

**Test Steps**:
1. Village vote with 16 players
2. **Expected**: Player grid renders smoothly
3. **Expected**: Grid uses responsive layout (4 columns)
4. **Expected**: Scrolling if >16 players
5. **Expected**: No lag on player selection
6. **Expected**: WebSocket messages delivered to all 16 clients
7. **Expected**: No timeout delays

**Metrics**:
- [ ] Player grid render time <100ms
- [ ] WebSocket fanout <500ms
- [ ] Action submission <200ms RTT
- [ ] Timer updates no frame drops

---

## UI/UX Tests

### Visual Consistency

**Test Steps**:
1. Open each action type
2. **Expected**: Color themes consistent
   - Seer: Purple (`bg-purple-900`)
   - Werewolf: Red (`bg-red-900`)
   - Witch: Green/Purple (`bg-green-900`, `bg-purple-900`)
   - Village: Blue (`bg-blue-900`)
3. **Expected**: PixelModal wrapper consistent
4. **Expected**: Buttons have hover states
5. **Expected**: Selection highlights work
6. **Expected**: Timer animation smooth

**Accessibility**:
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen reader announces action type
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Button labels descriptive

---

### Mobile Responsiveness

**Test Steps**:
1. Open on mobile device (or Chrome DevTools mobile view)
2. **Expected**: ActionModal fits screen
3. **Expected**: Player grid uses 2-3 columns (not 4)
4. **Expected**: Buttons large enough for touch (44px min)
5. **Expected**: Timer readable
6. **Expected**: No horizontal scroll
7. **Expected**: Touch selection works

---

## Debugging Guide

### Common Issues

**Issue**: Action modal doesn't appear
- **Check**: `gameStore.pendingActions` Map has entry
- **Check**: `gameStore.hasActiveAction` is true
- **Check**: WebSocket received `action_created` event
- **Fix**: Check event channel routing in `GameView.vue:450`

**Issue**: Timer not counting down
- **Check**: `useActions` composable initialized
- **Check**: `startTimer()` called in store
- **Check**: Browser console for interval errors
- **Fix**: Verify `src/composables/useActions.ts:78` timer logic

**Issue**: Submit button disabled
- **Check**: Selection state in component
- **Check**: `hasSelection` computed property
- **Fix**: Verify v-model bindings in action components

**Issue**: Action expires immediately
- **Check**: Backend `timeout` field in payload
- **Check**: Client-side `remainingSeconds` initialization
- **Fix**: Verify `src/stores/gameStore.ts:207` timeout parsing

**Issue**: Multiple actions shown at once
- **Check**: `currentAction` computed returns first action
- **Check**: ActionModal v-if logic
- **Fix**: Should only show one action at a time per player

---

## Backend Integration

### Expected Backend Behavior

**Action Creation**:
```json
{
  "channel": "action_event",
  "event_type": "action_created",
  "payload": {
    "action_id": "act_123",
    "type": "seer_vision",
    "timeout": 30,
    "payload": {
      "available_targets": [
        {"player_id": "p1", "player_name": "Alice"},
        {"player_id": "p2", "player_name": "Bob"}
      ]
    }
  }
}
```

**Action Response** (sent by frontend):
```json
{
  "channel": "action_event",
  "event_type": "action_response",
  "payload": {
    "action_id": "act_123",
    "response": {
      "target_id": "p1"
    }
  }
}
```

**Action Expiry**:
```json
{
  "channel": "action_event",
  "event_type": "action_expired",
  "payload": {
    "action_id": "act_123"
  }
}
```

### Backend Files to Reference
- `/var/home/nhpro/GolandProjects/shamus-backend/internal/game/actions/` - Action logic
- Backend commit: Jan 31, 2026 - Action system migration

---

## Test Checklist

### Phase 1: Basic Functionality
- [ ] Seer vision works (select, submit, receive result)
- [ ] Werewolf vote works (all werewolves vote, victim dies)
- [ ] Witch potion works (heal, poison, skip)
- [ ] Village vote works (all players vote, suspect eliminated)

### Phase 2: Timer System
- [ ] Timers count down correctly
- [ ] Warning animation at <10s
- [ ] Auto-expire at 0s
- [ ] Notifications on expiry
- [ ] Timer cleanup on submit

### Phase 3: Edge Cases
- [ ] Abstain/skip options work
- [ ] Dead players excluded from actions
- [ ] Multiple simultaneous actions
- [ ] WebSocket reconnection handling
- [ ] Large player counts (16+)

### Phase 4: UI/UX
- [ ] Color themes correct
- [ ] Responsive on mobile
- [ ] Keyboard navigation
- [ ] Accessibility features
- [ ] Visual polish (animations, hover states)

### Phase 5: Integration
- [ ] Backward compatibility with old system
- [ ] Deprecated components still work
- [ ] No TypeScript errors
- [ ] Production build successful
- [ ] No console errors

---

## Next Steps After Testing

1. **If all tests pass**:
   - Remove `NightActionModal.vue` (old component)
   - Remove `VotePanel.vue` (replaced by VillageAction)
   - Remove `@deprecated` methods from `useGameWebSocket.ts`
   - Remove old event handlers from `GameView.vue`
   - Update documentation

2. **If issues found**:
   - File bug reports with test case details
   - Fix critical issues before removing old system
   - Re-run affected test cases

3. **Performance optimization** (if needed):
   - Lazy load action components
   - Optimize player grid rendering
   - Add WebSocket message throttling
   - Profile timer performance

4. **Proceed to Phase 2**:
   - Refactor `GameView.vue` (extract tabs)
   - Create `ChatTab.vue`, `CompositionTab.vue`, `SettingsTab.vue`
   - Reduce `GameView.vue` from 1238 → ~300 lines

---

## Contact & Support

- **Frontend Repo**: `/var/home/nhpro/WebstormProjects/shamus-frontend`
- **Backend Repo**: `/var/home/nhpro/GolandProjects/shamus-backend`
- **Action System Commits**: See `git log --oneline -12`
- **Architecture Docs**: See `src/types/actions.ts` for type definitions

For questions about backend action logic, refer to backend project memories (Serena agent).
