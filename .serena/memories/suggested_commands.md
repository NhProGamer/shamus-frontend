# Commandes suggérées - Shamus Frontend

## Commandes npm/pnpm

### Développement
```bash
# Installer les dépendances
pnpm install

# Lancer le serveur de développement (hot reload)
pnpm dev
```

### Build et vérification
```bash
# Type-check TypeScript + Build production
pnpm build

# Type-check uniquement
pnpm type-check

# Build uniquement (sans type-check)
pnpm build-only

# Preview du build production
pnpm preview
```

## Commandes système utiles (Linux)

### Git
```bash
git status           # Voir l'état des fichiers
git diff             # Voir les modifications
git add .            # Ajouter tous les fichiers
git commit -m "msg"  # Créer un commit
git push             # Pousser les changements
git pull             # Récupérer les changements
```

### Navigation et fichiers
```bash
ls -la               # Lister les fichiers
cd <dir>             # Changer de répertoire
cat <file>           # Afficher un fichier
grep -r "pattern" .  # Rechercher un pattern
find . -name "*.vue" # Trouver des fichiers
```

## Variables d'environnement
- `VITE_API_URL` : URL de l'API backend (défaut: http://localhost:8080)

## Notes
- Pas de linter/formatter configuré (ESLint/Prettier non présents)
- Pas de tests configurés (pas de Vitest/Jest)
- Utilise pnpm workspaces (voir pnpm-workspace.yaml)
