# Cleanup Plan - Remove Old Event System

This document outlines the safe removal of deprecated code after the Action System migration is validated.

## ⚠️ Prerequisites

**DO NOT proceed with this cleanup until**:
1. ✅ All test cases in `TESTING.md` pass
2. ✅ Manual testing with real backend confirms action system works
3. ✅ Backend has fully migrated to action system (no old events sent)
4. ✅ Production deployment planned (can rollback if needed)

---

## Deprecated Components

### 1. `src/components/game/NightActionModal.vue`
- **Lines**: ~150 lines
- **Replaced by**: `src/components/game/actions/ActionModal.vue` (with sub-components)
- **Used in**: `src/views/GameView.vue:1243`
- **Dependencies**: Uses old `nightTurn` state from gameStore

**Removal Steps**:
1. Remove import from GameView.vue:21
2. Remove component from template GameView.vue:1243-1250
3. Delete file `src/components/game/NightActionModal.vue`
4. Test night phase still works with ActionModal

---

### 2. `src/components/game/VotePanel.vue`
- **Lines**: ~100 lines
- **Replaced by**: `src/components/game/actions/VillageAction.vue`
- **Used in**: `src/views/GameView.vue:1024`
- **Dependencies**: Uses old `voteState` from gameStore

**Removal Steps**:
1. Remove import from GameView.vue:20
2. Remove component from template GameView.vue:1024-1030
3. Delete file `src/components/game/VotePanel.vue`
4. Test village vote still works with VillageAction

---

## Deprecated Store State

### `src/stores/gameStore.ts`

**State to Remove**:
```typescript
// OLD: Event-based state (lines ~80-90)
const nightTurn = ref<NightTurn | null>(null)
const voteState = ref<VoteState | null>(null)
```

**Event Handlers to Remove**:
- `handleTurnEvent()` - Processed old turn_event channel
- `handleVoteEvent()` - Processed old vote_event channel
- Any turn_event/vote_event related computed properties

**Steps**:
1. Search for `nightTurn` references, ensure only used by old components
2. Search for `voteState` references, ensure only used by old components
3. Remove state declarations
4. Remove event handlers
5. Remove from exported store object
6. Verify build passes
7. Test entire game flow

---

## Deprecated WebSocket Methods

### `src/composables/useGameWebSocket.ts`

**Methods to Remove** (lines 119-200):
```typescript
// @deprecated methods
sendVillageVote(targetId: string | null)
sendSeerAction(targetId: string)
sendWerewolfVote(targetId: string)
sendWitchAction(action: { healVictim?: boolean; poisonTarget?: string })
```

**Replacement**: `sendActionResponse(actionId: string, response: ActionResponse)`

**Steps**:
1. Search codebase for calls to deprecated methods
2. Verify no active usage (should only be in old components)
3. Remove method implementations
4. Remove from exported object
5. Verify build passes
6. Test action submissions still work via `sendActionResponse`

---

## Deprecated Event Handlers

### `src/views/GameView.vue`

**Event Channel Handlers to Remove**:
```typescript
// OLD event channels (if backend no longer sends)
case EventChannelTurn:
  // handleTurnEvent logic
  break

case EventChannelVote:
  // handleVoteEvent logic
  break
```

**Check First**:
1. Confirm with backend team that these events are no longer emitted
2. Review backend commits (Jan 31, 2026 migration)
3. Test with real backend - monitor WebSocket messages

**Steps** (only if backend confirms):
1. Remove case statements from `handleIncomingMessage` switch
2. Remove any turn_event/vote_event type definitions from `src/types/events.ts`
3. Verify build passes
4. Test game doesn't break when old events absent

---

## File Deletion Summary

**Components** (delete entirely):
- [ ] `src/components/game/NightActionModal.vue`
- [ ] `src/components/game/VotePanel.vue`

**Code Removal** (edit files):
- [ ] `src/stores/gameStore.ts` - Remove nightTurn, voteState, old handlers
- [ ] `src/composables/useGameWebSocket.ts` - Remove 4 deprecated methods
- [ ] `src/views/GameView.vue` - Remove old imports, components, event handlers
- [ ] `src/types/events.ts` - Remove old event types (if confirmed unused)

**Estimated LOC Reduction**: ~500-700 lines

---

## Testing After Cleanup

### Critical Test Cases
1. **Seer Night Action**: Confirm ActionModal appears, not NightActionModal
2. **Werewolf Night Action**: Confirm ActionModal appears
3. **Witch Night Action**: Confirm ActionModal appears
4. **Village Vote**: Confirm VillageAction appears, not VotePanel
5. **Timer System**: Confirm timers still work
6. **Action Expiry**: Confirm timeout handling
7. **Full Game Flow**: Play through entire game start to finish

### Build Verification
```bash
# TypeScript check
pnpm type-check

# Production build
pnpm build

# Dev server
pnpm dev
```

### Runtime Verification
- [ ] No console errors
- [ ] No "component not found" errors
- [ ] All actions submit successfully
- [ ] WebSocket messages correct format
- [ ] No undefined references

---

## Rollback Plan

If issues arise after cleanup:

### Git Rollback
```bash
# View cleanup commits
git log --oneline -5

# Revert last commit
git revert HEAD

# Or hard reset (if not pushed)
git reset --hard HEAD~1
```

### Files to Restore
Keep backups of:
- `NightActionModal.vue`
- `VotePanel.vue`
- `gameStore.ts` (old handlers)
- `useGameWebSocket.ts` (deprecated methods)

### Restore Process
1. Git revert cleanup commit(s)
2. Verify old components work again
3. Investigate why new system failed
4. Fix issues in new system
5. Re-attempt cleanup

---

## Migration Checklist

### Pre-Cleanup
- [ ] All TESTING.md test cases passed
- [ ] Manual testing with backend completed
- [ ] Backend confirmed old events removed
- [ ] Team reviewed cleanup plan
- [ ] Backups created (git tags)

### During Cleanup
- [ ] Delete NightActionModal.vue
- [ ] Delete VotePanel.vue
- [ ] Remove old state from gameStore
- [ ] Remove deprecated WebSocket methods
- [ ] Remove old event handlers from GameView
- [ ] Remove old event types from events.ts
- [ ] Update imports/exports

### Post-Cleanup
- [ ] TypeScript build passes
- [ ] Vite production build passes
- [ ] Dev server runs without errors
- [ ] Full game playthrough successful
- [ ] All action types tested
- [ ] Timer system verified
- [ ] WebSocket reconnection tested
- [ ] Create cleanup commit
- [ ] Update documentation (README, CHANGELOG)

---

## Estimated Timeline

- **Preparation**: 30 minutes (review, backups, team sync)
- **Code Removal**: 1 hour (delete files, edit code)
- **Testing**: 2-3 hours (full test suite from TESTING.md)
- **Documentation**: 30 minutes (update docs)

**Total**: ~4-5 hours

---

## Commit Strategy

### Option A: Single Cleanup Commit
```bash
git commit -m "refactor: remove old event system after action migration

BREAKING CHANGE: Removed deprecated components and methods
- Delete NightActionModal.vue (replaced by ActionModal)
- Delete VotePanel.vue (replaced by VillageAction)
- Remove nightTurn/voteState from gameStore
- Remove sendVillageVote, sendSeerAction, sendWerewolfVote, sendWitchAction
- Remove turn_event and vote_event handlers

All functionality now uses new Action System.
See TESTING.md for migration validation."
```

### Option B: Incremental Commits
1. `refactor: remove NightActionModal component`
2. `refactor: remove VotePanel component`
3. `refactor: remove deprecated WebSocket methods`
4. `refactor: remove old event handlers from gameStore`
5. `docs: update after old system removal`

**Recommended**: Option A (atomic cleanup, easier rollback)

---

## Documentation Updates

After cleanup, update:

### README.md
- Remove mentions of old event system
- Update architecture diagram
- Link to Action System docs

### CHANGELOG.md
```markdown
## [Unreleased]

### Removed
- Old event-based game flow (turn_event, vote_event channels)
- NightActionModal component (replaced by ActionModal)
- VotePanel component (replaced by VillageAction)
- Deprecated WebSocket methods (sendVillageVote, sendSeerAction, etc.)
- gameStore nightTurn and voteState state

### Migration
All game actions now use the Action System. See TESTING.md for details.
```

### Code Comments
- Remove "TODO: migrate to action system" comments
- Remove "@deprecated" tags
- Update JSDoc for affected functions

---

## Risk Assessment

### Low Risk
- Deleting NightActionModal.vue (fully replaced)
- Deleting VotePanel.vue (fully replaced)
- Removing @deprecated WebSocket methods (no active usage)

### Medium Risk
- Removing nightTurn/voteState from store (verify no external refs)
- Removing old event handlers (ensure backend doesn't send old events)

### High Risk
- None (if testing completed successfully)

### Mitigation
- Comprehensive testing before cleanup
- Git tags for easy rollback
- Incremental deployment (staging → production)
- Monitor error logs post-deployment

---

## Success Criteria

Cleanup is successful when:
1. ✅ Build passes with no TypeScript errors
2. ✅ No runtime errors in browser console
3. ✅ All 4 action types work correctly
4. ✅ Timer system functions properly
5. ✅ Full game playable start to finish
6. ✅ WebSocket reconnection works
7. ✅ No references to deleted code
8. ✅ Documentation updated
9. ✅ Code review approved
10. ✅ Production deployment successful

---

## Contact

For questions or issues during cleanup:
- Review `TESTING.md` for test procedures
- Check git history: `git log --grep="action"`
- Review backend migration: `/var/home/nhpro/GolandProjects/shamus-backend`
- Consult Action System types: `src/types/actions.ts`

**DO NOT proceed with cleanup until all prerequisites met!**
