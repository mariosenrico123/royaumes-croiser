Royaumes Croises - Déploiement sur Replit (serveur + client)

Contenu:
- server.js        -> WebSocket + REST server (matchmaking simple)
- package.json     -> dépendances
- public/index.html -> client (jeu) - place here the full HTML provided by assistant

Déployer sur Replit:
1) Crée un nouveau Repl -> Node.js
2) Téléverse tous les fichiers/folders du ZIP à la racine du Repl (server.js, package.json, public/)
3) Ouvre public/index.html et assure-toi que le client WebSocket utilise la bonne URL.
   Pour dev: le client peut utiliser:
     const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
     connectWs(WS_URL);
   Ainsi le client se connectera automatiquement au serveur du même domaine.
4) Clique Run. Replit installe les dépendances et démarre le serveur.
5) Ouvre l'URL publique fournie par Replit. Le jeu sera servi et le WebSocket utilisera le même domaine.
6) Pour la persistance, profiles.json est écrit dans le Repl.

Note: Ce serveur est un prototype. Pour production, ajoute authentification, validation côté serveur des coups, et une vraie DB.
