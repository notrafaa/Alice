# Alice — Rhythm Game

Alice est un jeu de rythme web en **2K / 4K**. Tu uploades une musique locale, Alice génère une partition jouable, puis la musique joue en continu pendant que tu suis les notes au clavier.

L'objectif actuel est simple: une expérience solo rapide, très visuelle, personnalisable, avec des difficultés qui peuvent devenir vraiment dures.

## Lancer Le Projet

```bash
npm install
npm run dev
```

Puis ouvre:

```txt
http://localhost:3000
```

Build production:

```bash
npm run build
npm start
```

Aucune variable d'environnement n'est nécessaire pour jouer à la démo locale.

## Gameplay

1. Va dans **Solo**.
2. Upload une musique `.mp3` ou `.wav`.
3. Alice analyse le morceau dans le navigateur.
4. Choisis un mode:
   - **2K**: touches `F` `J`
   - **4K**: touches `X` `C` `N` `,`
5. Choisis rapidement la difficulté de **1 à 10**.
6. Lance la partie.

La musique ne dépend plus des touches: elle joue en continu. Les touches servent au score, au combo, aux effets visuels et à éviter une série de misses.

## Difficultés

Alice propose **10 niveaux**:

- `1-2`: simple / normal
- `3-5`: dense mais lisible
- `6-10`: modes beaucoup plus rapides avec des notes ajoutées entre les transients détectés

Les difficultés se changent rapidement depuis une grille `1 2 3 4 5 / 6 7 8 9 10`, sans relancer l'analyse.

## Misses Et Perte

Les erreurs ne coupent pas la musique.

Quand tu rates plusieurs notes d'affilée:

- les effets visuels deviennent de plus en plus agressifs;
- la stabilité baisse;
- après une trop longue série de misses, Alice affiche l'écran **Perdu**.

Les touches pressées dans le vide n'influencent pas la musique.

## Personnalisation

Dans les options simples, tu peux changer rapidement:

- la difficulté;
- le fond de partie;
- la couleur des touches;
- le mode solo / duel verrouillé.

Tu peux aussi choisir une image locale comme background de gameplay:

- `.png`
- `.jpg`
- `.webp`

Le mode avancé contient les réglages plus techniques:

- volume de la musique;
- latence clavier;
- vitesse des notes.

## Stack

| Partie | Tech |
| --- | --- |
| Framework | Next.js App Router |
| Langage | TypeScript |
| UI | React |
| Styles | Tailwind CSS |
| Animations | Framer Motion |
| État | Zustand |
| Audio | Web Audio API |
| Gameplay | Canvas 2D |

## Structure

```txt
app/                  Pages principales
components/menu/      Menu, logo, boutons, background
components/game/      Gameplay, options, pause, résultats
components/audio/     Upload et progression d'analyse
components/ui/        UI partagée, curseur custom, shell
lib/audio/            Décodage, analyse, playback
lib/game/             Chart, jugement, layouts 2K/4K, store
types/                Types partagés
docs/                 Plans architecture, multijoueur, Roblox
```

## Notes

Le bouton **Duel** dans le menu est volontairement verrouillé pour l'instant.

L'analyse audio est locale et approximative: Alice détecte les pics du morceau et construit une chart jouable. Ce n'est pas encore une transcription musicale parfaite.
