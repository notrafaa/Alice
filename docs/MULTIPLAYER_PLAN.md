# Plan Multijoueur — EXp3rience

Le multijoueur n'est pas développé dans la démo (bouton grisé « Bientôt » au menu),
mais le code et le schéma de données sont préparés pour l'ajouter sans refonte.

## Concept cible

Un groupe de joueurs joue **le même morceau en même temps**, chacun sur un
instrument différent (comme un vrai groupe). Score live visible par tous,
podium commun à la fin.

## Infrastructure : Supabase Realtime

Pas de serveur de jeu dédié pour la V1 : Supabase couvre tout.

| Besoin | Solution Supabase |
| --- | --- |
| Lobby / rooms | table `multiplayer_rooms` (+ code de join court) |
| Joueurs d'une room | table `multiplayer_players` + **Presence** (connex/déconnexion) |
| Choix d'instrument | update `multiplayer_players.instrument` + broadcast |
| Score live | **Broadcast** (éphémère, pas d'écriture DB par note) |
| État de partie | `multiplayer_rooms.status` : `lobby → countdown → playing → results` |
| Partage du morceau | Storage (le fichier uploadé par l'hôte) + `charts` en cache |

Les tables sont déjà typées dans `lib/supabase/types.ts`.

## Flow prévu

1. **Créer / rejoindre** — l'hôte crée une room (code à 6 caractères), les autres
   la rejoignent. Channel Realtime `room:{id}`, Presence activée.
2. **Lobby** — l'hôte uploade le morceau (analyse serveur ou locale partagée via
   Storage). Chaque joueur choisit un instrument libre (verrouillage par update
   optimiste sur `multiplayer_players.instrument`). Les instruments sans joueur
   peuvent être assignés à des **bots** (le champ `is_bot` existe déjà, et le mode
   solo « avec bots » utilise déjà cette simulation).
3. **Synchronisation de départ** — le problème central. Approche :
   - l'hôte fixe `song_start_at` (timestamp serveur + ~4 s de marge) ;
   - chaque client mesure son offset horloge via ping Supabase (moyenne de
     plusieurs allers-retours) ;
   - chaque client programme `GamePlayback.start()` sur son AudioContext pour
     que la musique démarre à l'instant commun (le moteur actuel sait déjà
     programmer un départ différé : `source.start(ctx.currentTime + délai)`).
   - tolérance cible < 30 ms entre clients, suffisante puisque **chaque client
     juge ses propres frappes localement** — rien de gameplay ne transite par
     le réseau.
4. **Pendant la partie** — chaque client envoie `{score, combo, accuracy}` en
   broadcast throttlé (~4 Hz, exactement comme le HUD bots actuel). L'UI affiche
   un mini-classement live. Un joueur déconnecté devient bot (Presence leave).
5. **Résultats** — chaque client écrit sa ligne `scores` ; l'écran de résultats
   affiche le podium de la room.

## Ce que le code actuel prépare déjà

- `GameScreen` lit tout depuis des props (`song`, `beatmap`, `instrumentId`,
  `options`) : il fonctionnera tel quel dans une room, seul le « conteneur »
  change (room au lieu du store solo).
- Les **bots simulés** du mode solo (indicateurs + score throttlé) sont le
  prototype exact de l'affichage des scores distants.
- Le départ de la musique est déjà **programmé** (`start(leadIn)`), pas immédiat —
  c'est la primitive nécessaire à la synchro multi-clients.
- `judging.ts` est déterministe et sans état global : le serveur pourra
  re-valider un score (anti-triche V2) en rejouant les timestamps de frappe.

## Étapes d'implémentation (ordre conseillé)

1. Auth anonyme Supabase + table `users`.
2. CRUD rooms + page `/multiplayer` (lobby, Presence).
3. Sélection d'instrument temps réel.
4. Mesure d'offset horloge + départ synchronisé.
5. Broadcast des scores live + UI classement en jeu.
6. Écran de résultats de room + persistance `scores`.
7. Dégrisage du bouton menu 🎉

## Anti-triche (plus tard)

- V1 : confiance client (party game entre amis).
- V2 : envoi des timestamps de frappe bruts, re-jugement serveur contre la
  chart, bornes statistiques (précision humainement plausible).
