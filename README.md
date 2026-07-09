# EXp3rience 🎧 — 音を、取り戻せ。

Jeu de rythme musical en navigateur — démo **solo** jouable, direction artistique
anime japonais (fin de journée à l'école, sakura, ciel de crépuscule).

Concept clé : **le morceau uploadé ne se joue pas tout seul.** Chaque note frappée
rejoue le fragment réel du morceau à cet instant ; enchaîne les notes et la musique
se reconstruit, reconnaissable — rate, et tu creuses un trou de silence. Uploade un
`.mp3` / `.wav`, choisis un instrument détecté dans le morceau, et reconstruis-le
au clavier.

Prototype sérieux pensé pour évoluer vers : un vrai **multijoueur temps réel**, une vraie
**séparation audio par instrument** (IA côté serveur) et un **portage Roblox** avec la même
logique de gameplay.

## Lancer le projet

```bash
npm install
npm run dev     # http://localhost:3000
```

Build production (compatible Vercel, zéro configuration) :

```bash
npm run build
npm start
```

Aucune variable d'environnement n'est requise pour la démo. Supabase est préparé mais
optionnel — voir [`.env.example`](.env.example).

## Stack

| Domaine | Choix |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| Styles | Tailwind CSS |
| Animations UI | Framer Motion |
| État de session | Zustand |
| Audio | Web Audio API (décodage, analyse, lecture synchronisée) |
| Rendu gameplay | Canvas 2D + `requestAnimationFrame` |
| Backend (préparé) | Supabase (client isolé, types de tables, non requis) |

## Comment jouer

1. **Menu** → Solo.
2. **Upload** d'un `.mp3` / `.wav` (drag & drop).
3. L'**analyse locale** détecte les transients par bande de fréquences, mesure la
   **présence de chaque instrument** dans le morceau (un titre sans basse ne proposera
   pas la basse, une ballade sans percussions ne proposera pas la batterie) et génère
   une partition par instrument détecté (approximation honnête — voir plus bas).
4. **Choisis ton instrument** puis tes **options** (bots, voix, musique fantôme,
   volume des frappes, latence, vitesse, difficulté).
5. Countdown **3 · 2 · 1 · GO** — puis silence : c'est à toi de jouer.
6. Chaque frappe réussie joue le **fragment réel du morceau** jusqu'à la note suivante ;
   enchaîne-les et la musique se reconstruit en continu. Fenêtres de jugement :

   | Fenêtre | Jugement |
   | --- | --- |
   | ±40 ms | PERFECT |
   | ±80 ms | GREAT (early/late affiché) |
   | ±120 ms | GOOD (early/late affiché) |
   | au-delà | MISS |

### Touches (clavier AZERTY)

| Instrument | Pistes | Touches |
| --- | --- | --- |
| Guitare électrique | 2 | `F` `J` |
| Guitare acoustique | 2 | `F` `J` |
| Piano | 4 | `X` `C` `N` `,` |
| Batterie | 4 | `X` `C` `N` `,` |
| Basse | 4 | `X` `C` `N` `,` |

La 4ᵉ touche est bien la **virgule** (touche à droite de N sur AZERTY) — le jeu compare
`KeyboardEvent.key`, donc le caractère réel, pas la position physique.

`Échap` = pause (reprendre / recommencer / quitter).

## ⚠️ Analyse audio : démo vs futur

La démo utilise le **DemoLocalAudioEngine** (`lib/audio/demoLocalAudioEngine.ts`) :
une analyse **locale et approximative** — détection de pics d'énergie par bande de
fréquences (biquad band-pass par instrument), répartition sur les pistes par heuristique
de brillance. Ce n'est **pas** une vraie séparation d'instruments, mais c'est jouable et
musical.

L'architecture est prête pour brancher le **FutureStemSeparationEngine**
(`lib/audio/futureStemSeparationEngine.ts`) : upload Supabase Storage → worker serveur
(Demucs/Spleeter) → stems par instrument → beatmaps précises stockées et mises en cache.
Même interface `AnalysisEngine`, zéro changement côté gameplay.
Détails : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Structure

```
app/                  Pages (/, /solo, /game, /settings, /credits)
components/menu/      Menu principal (background animé, boutons, logo)
components/game/      Gameplay (canvas, HUD, pause, résultats, instruments, options)
components/audio/     Upload + progression d'analyse
components/ui/        Shell de page partagé
lib/audio/            Analyse (decode/onsets/beatmap), moteurs demo & futur, lecture
lib/game/             Instruments, jugement/score, filtres de chart, store Zustand
lib/supabase/         Client optionnel + types des tables futures
types/                Types du domaine (portables, sans dépendance navigateur)
docs/                 ARCHITECTURE, MULTIPLAYER_PLAN, ROBLOX_PORT_PLAN
```

## Docs

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — vue d'ensemble, moteur audio 2 niveaux, schéma Supabase futur.
- [`docs/MULTIPLAYER_PLAN.md`](docs/MULTIPLAYER_PLAN.md) — plan du multijoueur (rooms, Realtime, sync horloge).
- [`docs/ROBLOX_PORT_PLAN.md`](docs/ROBLOX_PORT_PLAN.md) — plan de portage Roblox + format JSON de beatmap.
