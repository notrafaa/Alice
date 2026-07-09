# Plan de portage Roblox — EXp3rience

Objectif : recréer le jeu sur Roblox avec **la même logique de gameplay et la même
interface**, en réutilisant au maximum les données et les règles du projet web.

## 1. Ce qui est général (réutilisable tel quel)

Tout ce qui est dans `types/` et `lib/game/` est du **pur data/logique**, sans
dépendance navigateur — c'est le contrat à transposer en Luau :

| Concept | Source web | Portage Roblox |
| --- | --- | --- |
| Notes, charts, beatmap | `types/index.ts` | mêmes champs en tables Luau |
| Instruments (pistes, touches, couleurs, bandes) | `lib/game/instruments.ts` | table de constantes Luau |
| Fenêtres de timing (±40/±80/±120 ms, miss à 140 ms) | `lib/game/judging.ts` | constantes identiques |
| Score (100/70/40 + bonus combo +1%/step, cap +50%) | `judging.ts` | formule identique |
| Précision pondérée (1 / 0.7 / 0.4 / 0) et rangs S≥95, A≥88, B≥75, C≥60, D | `judging.ts` | formule identique |
| Filtre de difficulté (gap min + force min) | `lib/game/chart.ts` | même filtre |

## 2. Ce qui est spécifique au navigateur (à réimplémenter)

| Web | Équivalent Roblox |
| --- | --- |
| Web Audio `AudioContext.currentTime` | `Sound.TimePosition` + `os.clock()` interpolé |
| Canvas 2D + `requestAnimationFrame` | `RunService.RenderStepped` + Frames/ImageLabels UI |
| `KeyboardEvent.key` | `UserInputService.InputBegan` (`KeyCode`) |
| Framer Motion | `TweenService` |
| Upload + analyse locale | **impossible côté client Roblox** → beatmaps pré-générées (voir §5) |
| Zustand | module d'état Luau simple |

## 3. Gameplay : comment ça marche (référence d'implémentation)

### Lanes et chute des notes

- Chaque instrument a 2 ou 4 **lanes verticales**. La note apparaît en haut et
  atteint le **cercle de frappe** (bas de l'écran) exactement à `note.time`.
- Position à chaque frame : `progress = 1 - (note.time - songTime) / travelTime`
  puis `y = spawnY + progress * (hitY - spawnY)`.
  `travelTime = 1.9 / noteSpeed` secondes (constante web à conserver).
- `songTime` doit venir de l'horloge audio (`Sound.TimePosition`), jamais d'un
  accumulateur de frames — c'est la règle n°1 du portage.
- Countdown : la musique démarre 5 s après le lancement (READY → 3 → 2 → 1 → GO),
  `songTime` est négatif pendant cette marge.

### Mapping des touches

- 2 lanes : `F`, `J` — 4 lanes : `X`, `C`, `N`, `,` (virgule, AZERTY).
- Sur Roblox, mapper par `Enum.KeyCode` (F/J/X/C/N/Comma) et prévoir un
  remapping (les layouts varient) ; afficher la touche dans chaque cercle,
  comme sur le web.

### Jugement d'une frappe

1. `pressTime = songTime - latencyOffset`.
2. Chercher la note `pending` de la lane la plus proche dans ±120 ms.
3. `delta = (pressTime - note.time) * 1000` →
   ±40 PERFECT · ±80 GREAT · ±120 GOOD ; sinon frappe ignorée.
4. Note non frappée 140 ms après son temps → MISS, combo = 0.
5. Score : `base[jugement] * (1 + min(combo, 50) * 0.01)` arrondi.
6. Feedback : flash du cercle, onde de choc colorée, texte PERFECT/GREAT/GOOD/MISS
   (+ EARLY/LATE), incrément combo.

### Interface à reproduire

- Score en haut à gauche, précision + combo en haut à droite, bouton pause.
- Popup de jugement au centre (38% de hauteur), au-dessus des lanes.
- Barre de progression du morceau en bas.
- Écran résultats : rang géant coloré (S doré, A vert, B bleu, C violet, D rouge),
  score / précision / combo max, barres Perfect/Great/Good/Miss, boutons
  Rejouer · Changer d'instrument · Menu.

## 4. Format d'échange des beatmaps

Le web exporte déjà ce JSON (bouton « Exporter la beatmap » sur /solo,
`lib/game/chart.ts → exportBeatmapJson`) :

```json
{
  "songId": "demo-song",
  "title": "Uploaded Song",
  "duration": 120,
  "bpm": 128,
  "source": "demo-local-analysis",
  "createdAt": "2026-07-05T12:00:00.000Z",
  "charts": {
    "electric_guitar": {
      "instrument": "electric_guitar",
      "lanes": 2,
      "keys": ["f", "j"],
      "difficulty": 3,
      "notes": [
        { "id": "electric_guitar-0", "time": 5.201, "lane": 0, "instrument": "electric_guitar", "hitState": "pending", "strength": 0.8 }
      ]
    }
  }
}
```

Conversion Roblox :

1. `HttpService:JSONDecode` (ou conversion offline en ModuleScript Luau pour
   éviter HttpService en runtime).
2. `time` reste en secondes ; `lane` reste 0-based (ou +1 si on préfère les
   conventions Luau, à convertir à l'import).
3. `hitState` est toujours `"pending"` à la sérialisation — c'est un champ
   runtime.
4. Les morceaux devant être uploadés sur Roblox comme assets audio approuvés,
   chaque beatmap doit référencer l'`assetId` du son en plus du `songId`.

## 5. Pipeline de contenu Roblox

L'analyse en temps réel côté client n'existe pas sur Roblox. Le flux prévu :

```
Musique → pipeline web (démo locale ou future séparation IA serveur)
        → Beatmap JSON (format ci-dessus, stocké dans Supabase `charts`)
        → export ModuleScript Luau (script de conversion)
        → Roblox : catalogue de morceaux pré-analysés + assetId audio
```

Le futur backend Supabase devient ainsi la **source unique de vérité** des
beatmaps pour les deux plateformes.

## 6. Ordre de portage conseillé

1. Module Luau `Judging` (constantes + formules — tests unitaires faciles).
2. Module `Instruments` + `Beatmap` (import JSON).
3. Boucle de jeu : `Sound.TimePosition` + RenderStepped + rendu des lanes/notes.
4. Input + jugement + effets.
5. HUD, pause, résultats.
6. Menu (écran titre) — reprendre la direction artistique néon/sombre.
7. Multijoueur Roblox (les services natifs remplacent Supabase Realtime, la
   logique de room de MULTIPLAYER_PLAN.md reste valable).
