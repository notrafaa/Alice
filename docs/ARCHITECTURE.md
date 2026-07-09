# Architecture — EXp3rience

## Vue d'ensemble

```
┌────────────────────────── Navigateur ──────────────────────────┐
│                                                                │
│  /            Menu principal (écran titre)                     │
│  /solo        Upload → Analyse → Instrument → Options          │
│  /game        Countdown → Gameplay canvas → Résultats          │
│  /settings    Options partagées + mapping clavier              │
│  /credits     Crédits                                          │
│                                                                │
│  Zustand (useSessionStore) transporte entre les pages :        │
│  AudioBuffer décodé, Beatmap générée, instrument, options.     │
│                                                                │
│  lib/audio ── DemoLocalAudioEngine (actif)                     │
│           └── FutureStemSeparationEngine (stub documenté)      │
│  lib/game  ── instruments, jugement, score, filtres de chart   │
│  types/    ── données du jeu, 100% portables (Roblox-ready)    │
└────────────────────────────────────────────────────────────────┘
                    (futur) ↕ Supabase : Storage, Postgres, Realtime
```

## Séparation des couches (règle de portabilité)

- **`types/`** : données pures du jeu (notes, charts, jugements, options). Aucune
  référence au DOM, à React ou au Web Audio. C'est le contrat réutilisé tel quel
  pour Roblox et Supabase.
- **`lib/game/`** : logique de gameplay pure (fenêtres de timing, score, combo,
  rang, filtres de difficulté). Portable également — seules les constantes
  comptent, pas le runtime.
- **`lib/audio/`** : tout ce qui touche au Web Audio (spécifique navigateur).
- **`components/`** : rendu React/canvas (spécifique navigateur).

## Moteur audio à deux niveaux

### Niveau 1 — `DemoLocalAudioEngine` (actif dans la démo)

Pipeline 100% navigateur, zéro serveur :

1. `decodeAudioFile` — décodage `.mp3`/`.wav` en `AudioBuffer`.
2. `analyzeAudioBuffer` — enveloppe RMS, onsets globaux, estimation BPM
   (autocorrélation du train d'impulsions).
3. `renderInstrumentBand` — pour chaque instrument, rendu offline
   (`OfflineAudioContext`) à travers un band-pass correspondant à sa bande de
   fréquences (ex. basse 40–250 Hz, guitare électrique 400–2400 Hz).
4. `detectOnsets` — flux d'énergie positif + seuil adaptatif + peak-picking
   sur le signal filtré.
5. `createInstrumentChart` — répartition des onsets sur les pistes par quantiles
   de brillance (taux de passage à zéro), anti-répétition de piste, calcul de
   difficulté par densité.
6. `generateBeatmap` — assemble un chart par instrument dans le format
   d'échange `Beatmap` (JSON exportable).

**Limites assumées** : ce n'est pas une séparation de sources. Deux instruments
qui partagent une bande de fréquences produisent des charts corrélées. L'option
« voix coupée » est une annulation mid-side (karaoké), pas un mute de stem.
C'est documenté dans l'UI d'analyse pour ne pas survendre la démo.

### Niveau 2 — `FutureStemSeparationEngine` (préparé, non actif)

Même interface `AnalysisEngine` (donc swap transparent) :

1. Upload du fichier dans Supabase Storage (bucket `songs`), hash de contenu
   pour dédupliquer et **réutiliser les analyses en cache**.
2. Ligne `songs` (status `processing`) + déclenchement d'un worker serveur
   (Edge Function → job GPU : Demucs/Spleeter).
3. Séparation en stems : voix, batterie, basse, piano, guitare électrique,
   guitare acoustique → `song_stems`.
4. Détection d'onsets/pitch **par stem** → une ligne `charts` par instrument
   (même schéma JSON `Beatmap` que la démo).
5. Le client suit l'avancement via Realtime, puis télécharge stems + charts.

Gains immédiats une fois branché : mute réel de la voix, mixer par stem,
bots audibles jouant leur propre stem, charts fidèles à l'instrument.

## Synchronisation du gameplay

- Horloge unique : `AudioContext.currentTime`. Jamais `setInterval`/`Date.now`
  pour le timing de jeu.
- `GamePlayback.start(leadIn)` programme le départ de la musique à
  `currentTime + 5 s` (countdown 3-2-1-GO + marge). `getSongTime()` est négatif
  pendant le lead-in ; les notes tombent déjà pendant le countdown si besoin.
- **Pause** : `AudioContext.suspend()` gèle `currentTime`, donc la musique, les
  notes et les effets se figent ensemble sans état supplémentaire.
- Rendu : canvas 2D redessiné à chaque `requestAnimationFrame` (notes, lanes,
  cercles de frappe, ondes de choc). Le HUD (score/combo/jugements) est en DOM
  + Framer Motion, mis à jour uniquement sur événement.
- Jugement : au `keydown`, on cherche la note pending la plus proche dans la
  piste, fenêtres PERFECT ±40 ms / GREAT ±80 ms / GOOD ±120 ms, MISS au-delà de
  140 ms de retard. L'offset de latence clavier (option) est soustrait du temps
  de frappe. EARLY/LATE et le delta en ms sont affichés.

## Difficulté

L'analyseur génère toujours des charts denses (« hard »). La difficulté choisie
est un **filtre au lancement du jeu** (`lib/game/chart.ts` → `applyDifficulty`),
donc changer la difficulté ne relance jamais l'analyse audio.

## Supabase (préparé, optionnel)

- `lib/supabase/client.ts` — `getSupabase()` retourne `null` sans env vars ;
  aucune fonctionnalité de la démo n'en dépend.
- `lib/supabase/types.ts` — schéma typé des tables futures :
  `users`, `songs`, `song_stems`, `charts`, `scores`,
  `multiplayer_rooms`, `multiplayer_players`.
- `.env.example` — variables documentées.

Scores futurs : une ligne `scores` par (user, song, instrument) — classements
par musique et par instrument déjà couverts par ce schéma.

## Ce qui est volontairement absent de la démo

- Authentification (aucun compte requis).
- Notes longues (le type `Note.duration` existe déjà, le renderer les ignorera
  tant qu'elles ne sont pas générées).
- Multijoueur (menu grisé « Bientôt ») — plan complet dans
  [MULTIPLAYER_PLAN.md](MULTIPLAYER_PLAN.md).
