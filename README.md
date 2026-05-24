# ECHO DASH

> **Run · Die · Remember · Repeat**
>
> A neon cyberpunk rhythm runner built with React + Vite + Canvas.

Echo Dash is a Geometry Dash-style auto-runner with three original signature features:

1. **Ghost Replay** — your best previous run plays back as a translucent ghost beside you.
2. **Beat Pulse World** — every visual element pulses to a synthetic beat (background glow, grid, obstacles, particles, UI).
3. **Level Mood System** — the world transforms across 4 atmosphere zones as you progress: Blue → Purple Glitch → Red Danger → White Finale.

---

## Quick start

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Other scripts

```bash
npm run build     # production build → dist/
npm run preview   # preview the production build locally
```

---

## Controls

| Action  | Input                              |
|---------|------------------------------------|
| Jump    | `Space` · Mouse Click · Touch/Tap  |
| Restart | `R` (after death)                  |
| Mute    | `M` · 🔊 button in HUD             |
| Menu    | `Esc` (during play / overlays)     |

---

## Levels

| Mode         | Length     | Obstacles | Time   |
|--------------|------------|-----------|--------|
| **Demo Run** | 37,500 px  | 90        | ~1:13  |
| **Full Run** | 91,680 px  | 232       | ~3:00  |

Both levels traverse all four mood zones with handcrafted rhythm patterns: spike trains, double/triple spikes, alternating waves, staircases, platform corridors, gap traps, mover swarms, glitch sections, and speed portals.

---

## Project structure

```
echo-dash/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx                 # Screen routing + persistence
    ├── styles.css              # Neon / glassmorphism design system
    ├── components/
    │   ├── MainMenu.jsx
    │   ├── HowToPlay.jsx
    │   ├── Settings.jsx
    │   ├── SkinSelector.jsx
    │   ├── GameCanvas.jsx      # Canvas host + HUD
    │   ├── GameOver.jsx
    │   └── VictoryScreen.jsx
    └── game/
        ├── engine.js           # rAF loop, physics, rendering
        ├── levels.js           # Handcrafted Demo + Full levels
        ├── collisions.js       # AABB + fair spike hitboxes
        ├── particles.js        # Trail / burst / ambient particles
        ├── replay.js           # Ghost record / sample / localStorage
        ├── audio.js            # Web Audio synth music + SFX
        └── constants.js        # Colors, skins, mood blending
```

---

## Signature features

### Ghost Replay
- Each run records `(distance, y, rotation)` every ~28 px of world travel.
- When a new attempt exceeds the previous best %, the recording is saved to `localStorage`.
- The ghost is sampled via binary search on world-x and drawn as a translucent cyan-white cube.
- Ghost cannot collide — purely visual.
- Toggleable in **Settings → Show Ghost**.

### Beat Pulse World
- A `beatPhase` accumulator driven by each mood zone's `pulseHz` (1.6 → 3.2 Hz).
- Pulses cube glow, obstacle shadowBlur, background radial vignette, grid brightness, particle intensity, and the progress bar shine.
- A synthetic 132 BPM track (kick + saw bass + hi-hat) generated entirely via Web Audio — no external assets.

### Level Mood System
| Range    | Zone           | Primary | Notes                          |
|----------|----------------|---------|--------------------------------|
| 0 – 30%  | Blue Zone      | Cyan    | Calm pulse, gentle grid        |
| 30 – 60% | Purple Glitch  | Magenta | Scanlines + glitch bar offsets |
| 60 – 85% | Red Danger     | Red     | Faster pulse, stronger shake   |
| 85 – 100%| White Finale   | White   | Speed boost, intense glow      |

Colors smoothly blend in the last 15% of each zone for a seamless transition.

---

## Skins

4 selectable cube skins, persisted in `localStorage`:

- **Cyan Core**
- **Purple Pulse**
- **Red Glitch**
- **Gold Runner**

---

## Settings (all persisted)

- Show Ghost
- Sound & Music
- Particles
- Screen Shake
- Reduced Motion

---

## Tech

- **React 18** for UI screens / overlays
- **Vite** for dev server & bundling
- **Canvas 2D** for the entire game render (DPR-aware, letterboxed `1280 × 720` base resolution)
- **Web Audio API** for synthetic music + SFX
- **localStorage** for best %, attempts, skin, settings, ghost frames
- `requestAnimationFrame` loop with `deltaTime`-based physics
- Listeners/RAF cleaned up on unmount — no leaks

---

## License

Original art / code / audio. No copyrighted assets used. Free to fork for educational / competition demo purposes.
