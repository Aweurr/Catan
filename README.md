# Catan en ligne

Implémentation du jeu de société *Catan* (règles de base 3-4 joueurs + extension
5-6 joueurs), jouable en ligne à plusieurs via des salons par code, construite
avec [boardgame.io](https://boardgame.io/).

## Structure du monorepo

```
packages/game/     Règles du jeu (boardgame.io Game), pures, partagées client/serveur
apps/server/        Serveur boardgame.io (Koa + Socket.IO) + API de salons par code
apps/web/           Client React (Vite)
docker/             docker-compose + exemple de config nginx pour le déploiement
```

## Développement

Prérequis : [mise](https://mise.jdx.dev/) (gère Node 22 / pnpm 10 automatiquement,
voir `mise.toml`).

```bash
mise trust   # première fois seulement
pnpm install
```

Lancer le serveur et le client en parallèle :

```bash
pnpm --filter @catan/server run dev   # http://localhost:8000
pnpm --filter @catan/web run dev      # http://localhost:5173
```

Le client Vite proxy `/api`, `/games` et `/socket.io` vers le serveur (voir
`apps/web/vite.config.ts`), donc tout fonctionne en local sans configuration
supplémentaire.

### Tests

```bash
pnpm --filter @catan/game run test        # règles + intégration boardgame.io
pnpm --filter @catan/game run typecheck
pnpm --filter @catan/server run typecheck
pnpm --filter @catan/web run typecheck
```

## Comment jouer

1. Un joueur crée une salle (3 à 6 joueurs) sur la page d'accueil : il obtient
   un code à 6 caractères.
2. Les autres joueurs entrent ce code sur la page d'accueil pour rejoindre.
3. Une fois tous les sièges pourvus, n'importe quel joueur peut lancer la
   partie depuis la salle d'attente.
4. Placement initial (ordre serpentin), puis tours normaux : lancer les dés,
   construire (route/colonie/ville), acheter/jouer des cartes développement,
   échanger (banque/port ou entre joueurs), déplacer le voleur sur un 7.
   Victoire à 10 points.

Les identifiants de partie (playerID + credentials boardgame.io) sont stockés
dans le `localStorage` du navigateur, par salle — un rafraîchissement de page
reconnecte automatiquement au bon siège.

## Déploiement

Le `Dockerfile` à la racine construit le client React puis l'empaquette avec
le serveur : un seul conteneur, un seul port exposé (8000 par défaut), sert à
la fois l'API/WebSocket du jeu et les fichiers statiques du client.

```bash
docker compose -f docker/docker-compose.yml up --build
```

La partie est persistée sur disque (adaptateur `FlatFile` de boardgame.io) via
un volume Docker nommé (`catan-data`), donc les parties en cours survivent à
un redémarrage du conteneur.

Pour l'exposer sur un nom de domaine avec HTTPS, voir l'exemple de config
reverse-proxy dans `docker/nginx/catan.conf.example` (nginx + certbot) — à
adapter selon l'hébergeur choisi. Le serveur lui-même est agnostique de la
plateforme (pas de dépendance à un PaaS particulier).

### Variables d'environnement (serveur)

| Variable       | Défaut                        | Rôle                                      |
| -------------- | ------------------------------ | ------------------------------------------ |
| `PORT`         | `8000`                         | Port d'écoute HTTP/WebSocket               |
| `STORAGE_DIR`  | `apps/server/storage`          | Dossier de persistance (parties + salons)  |
| `CORS_ORIGIN`  | localhost uniquement           | Origines autorisées, si le client est servi ailleurs |

## Limites connues

- Les noms des joueurs affichés dans le journal de partie interne (`G.log`,
  ex. « Player 2 construit une route ») restent génériques : le nom réel
  choisi au moment de rejoindre n'existe que dans les métadonnées de lobby de
  boardgame.io (`matchData`), pas dans l'état de jeu `G` lui-même — l'UI
  utilise donc `matchData` pour l'affichage des noms partout ailleurs.
- Le placement des ports (harbors) suit la répartition officielle (types et
  quantités) mais pas le tracé exact du plateau physique — leur position sur
  le pourtour est générée algorithmiquement plutôt que reproduite pixel pour
  pixel.
