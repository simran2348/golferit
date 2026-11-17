# Golferit ⛳

A 3D mini golf game that runs inside a Reddit post, built on [Devvit Web](https://developers.reddit.com/).

Every day a new **Daily Challenge** post appears with one of the built-in holes. Players putt across a colorful low-poly course on a floating island, try to sink the ball in as few strokes and as little time as possible, compete on that post's leaderboard, and keep a daily streak going.

## How to play

1. Open a Golferit post and tap **Play**.
2. **Press anywhere, pull back, release.** The arrow shows direction, and its length and color (green → red) show power.
3. Get the ball in the cup in as few strokes as you can:
   - A ball that rolls over the cup too fast skips across it.
   - Water or out of bounds costs **+1 stroke**, and the ball goes back to where you shot from.
   - Moving obstacles (windmill blades, sliders) can block your shot, so timing matters.
   - On a bridge you're safe; roll off it and you're in the water.
   - The hole ends after 10 strokes.
4. Use the **+ / −** buttons to zoom. Zoomed in, the camera follows the ball; **⤢** shows the whole course again. Buttons are used instead of pinch so a zoom can never be mistaken for a putt.
5. Your score is saved if you're logged in to Reddit. Tap 🏆 to see the leaderboard.

**Daily streak:** finish the day's challenge on that day (UTC) to extend your streak 🔥. Replaying the same day doesn't add to it, older dailies and practice posts don't count, and missing a day resets it.

**Ranking:** fewest strokes first, then fastest time. The timer starts at your first putt and stops when the ball drops in.

## Features

- Four hand-made holes: **Meadow Mill** (windmill), **Bridge Bay** (plank over a bay), **Slider Alley** (moving blocks), **Tunnel Twist** (tunnel, slider and bridge)
- Three.js low-poly look: floating islands, wooden walls, water, soft shadows, a fixed isometric camera with button zoom
- Automatic daily challenge post at 00:00 UTC, rotating through the holes, plus daily streaks
- Rapier physics with a fixed 120 Hz step (the same result on every device's frame rate)
- Works with mouse and touch; responsive from 360 px phones to desktop
- Server-timed and server-validated scores, personal bests, and a leaderboard per post (Devvit Redis)

## Tech stack

| Layer    | Tools                                               |
| -------- | --------------------------------------------------- |
| Client   | React 19, Three.js, Rapier 3D, Tailwind CSS 4, Vite |
| Server   | Node.js, Hono, Devvit Redis                         |
| Language | TypeScript (strict)                                 |

## Getting started

Requires **Node 24.18+** (see `.nvmrc`) and a Reddit account connected to [Reddit Developers](https://developers.reddit.com/).

```bash
npm install
npm run login   # once: authorise the Devvit CLI
npm run dev     # playtest live on r/golferit_dev (rebuilds on save)
```

Installing the app posts today's challenge automatically. After that a scheduled task posts a new one every day at 00:00 UTC. Moderators also get two subreddit menu items (**⋯ menu**):

- **Post today's daily challenge**: creates it if the scheduled task hasn't yet (it never posts twice for one day).
- **Create a practice post**: a free-play post on a random hole, with its own leaderboard and no streak.

## Commands

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Live playtest on Reddit (`devvit playtest`) |
| `npm run build`      | Build client and server into `dist/`        |
| `npm run test:types` | TypeScript type check                       |
| `npm run lint`       | ESLint                                      |
| `npm run test:unit`  | Unit tests (`src/**/*.test.ts`)             |
| `npm run deploy`     | Type check, lint, then upload a new version |
| `npm run launch`     | Deploy and publish for review               |

## Project structure

```
src/
  shared/          Code used by both client and server
    types/         Course data model (plain JSON-serializable data)
    courses/       The built-in holes and the catalog
    constants/     Dimensions and rules
    course/        Geometry, game rules, moving-obstacle timing
    daily.ts       Daily rotation, post data, date helpers
    scoring.ts     Score packing (strokes + time) and time formatting
    api.ts         Request/response types
  client/          Runs in the iframe on reddit.com
    splash.tsx     Lightweight feed preview (no Three.js)
    game.tsx       Full-screen game entry
    game/
      engine/      Renderer, camera, lighting, render loop, cleanup
      objects/     3D meshes built from course data
      physics/     Rapier world (loaded as a separate chunk)
      logic/       Game state machine and per-step rules
      controls/    Pull-back shot input
    components/    HUD, leaderboard, result card
    services/      API client and the store that submits scores
  server/
    routes/        API, moderator menu, install trigger, scheduler
    services/      Posts, rounds, validation, leaderboard, streaks (Redis)
```

## How it works

**Data-driven courses.** A course is plain data (outline, tee, cup, water, obstacles) in `src/shared`. The renderer, the physics colliders and the server validator all read the same definition, so they can't drift apart. That data model is what a future course editor would produce.

**The game loop stays out of React.** `GameEngine` owns Three.js and Rapier and runs its own frame loop. React only re-renders on game events (a shot, a stop, a penalty, the finish). The timer updates the page directly instead of re-rendering React.

**Moving obstacles depend only on time.** The windmill's blade angle is `windmillBladeAngle(obstacle, t)` and a slider's position is `sliderOffset(obstacle, t)`. The visual mesh and its physics collider evaluate the same function, so they stay in sync.

**Each post knows its hole.** When the app creates a post it attaches `postData` (`{ kind, courseId, date, number }`). Client and server both read it from Devvit's context, so the splash shows the challenge instantly and the server validates scores against the right course. Posts without `postData` (created before daily challenges) play Meadow Mill.

**The daily rotation is deterministic.** Challenge #1 was 2026-11-18, and each day takes the next hole in the catalog. The scheduler, the install trigger and the moderator menu all go through one function that creates at most one post per day.

**Fast first load.** Rapier's WebAssembly is about 1.65 MB gzipped, so it's loaded in its own chunk after the course is already on screen. The game shell is about 157 KB gzipped, and the feed splash never loads Three.js or Rapier.

## Scoring and anti-cheat

Player identity always comes from Devvit's trusted request context, never from the request body.

1. **First putt:** `POST /api/round/start`. The server stores a single-use round with its own start time.
2. **Ball holed:** `POST /api/round/submit` with the shot log (time, position, direction and power for each shot) and the penalty count.
3. **The server:**
   - takes the official time from its own clock;
   - counts strokes itself (shots + penalties) instead of trusting a client number;
   - rejects implausible rounds: not starting from the tee, shots off the course, invalid power or direction, too many strokes, impossibly fast;
   - keeps only each player's best score.

Scores are stored in a Redis sorted set per post. The score packs strokes and time together (`strokes × 10⁸ + ms`, lower is better), so a single ranked read returns the leaderboard.

> **Limitation:** these are plausibility checks, not a full replay. Each player's best shot log is stored so a deterministic server-side replay can be added later.

| Endpoint                 | Purpose                                                                  |
| ------------------------ | ------------------------------------------------------------------------ |
| `GET /api/init`          | Current user, post's challenge info, your best on this post, your streak |
| `GET /api/leaderboard`   | Top 10, your best and rank, player count                                 |
| `POST /api/round/start`  | Begin an official, server-timed round                                    |
| `POST /api/round/submit` | Validate and record a finished round                                     |

## Things to know

- **Logged-out viewers** can play and see the leaderboard, but scores aren't saved.
- **Leaderboards are per post.** Each daily (and each practice post) has its own board.
- **Days are UTC.** The daily post and streak days roll over at 00:00 UTC, which isn't midnight for most players.
- **The timer is real elapsed time.** It keeps running if you switch tabs mid-round.
- **Rounds that hit the 10-stroke limit aren't submitted.**
- **WebGL 2 is required.** Unsupported devices see a message instead of the game.

## Roadmap

- [x] 3D course, lighting, responsive layout
- [x] Physics, shot controls, hazards, stroke counting
- [x] Timed, server-validated scores and leaderboards
- [x] Daily challenge with streaks, button zoom
- [x] Bridges, tunnels, sliding obstacles
- [ ] Course editor and community-published courses
- [ ] Creator rankings
- [ ] Ramps and elevation
- [ ] Server-side replay validation

## License

BSD-3-Clause. See [LICENSE](LICENSE).
