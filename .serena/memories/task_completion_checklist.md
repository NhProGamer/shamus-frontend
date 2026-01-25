# Checklist de fin de tâche - Shamus Frontend

## Avant de terminer une tâche

### 1. Vérification TypeScript
```bash
pnpm type-check
```
- S'assurer qu'il n'y a pas d'erreurs de type
- Vérifier les imports de types (`import type`)

### 2. Build de production
```bash
pnpm build
```
- Vérifier que le build passe sans erreur
- Tester le build avec `pnpm preview` si nécessaire

### 3. Vérifications manuelles
- [ ] Le code suit les conventions du projet (voir `code_style_conventions.md`)
- [ ] Les nouveaux types sont correctement définis dans `/src/types/`
- [ ] Les composants Vue utilisent `<script setup lang="ts">`
- [ ] Les nouvelles fonctionnalités sont compatibles avec le système WebSocket existant

### 4. État Git
```bash
git status
git diff
```
- Vérifier les fichiers modifiés
- S'assurer qu'aucun fichier sensible n'est inclus

## Notes importantes

### Pas de linter/formatter automatique
- Le projet n'a pas ESLint/Prettier configurés
- Respecter manuellement les conventions de style

### Pas de tests automatisés
- Le projet n'a pas de suite de tests configurée
- Tester manuellement les fonctionnalités

### Variables d'environnement
- Vérifier que les nouvelles variables sont documentées
- Ne pas commiter de secrets/tokens
