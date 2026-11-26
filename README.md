# Golferit ⛳

A 3D mini golf game that runs inside a Reddit post, built on [Devvit Web](https://developers.reddit.com/).

Every day a new **Daily Challenge** post appears with one of the built-in holes. Players putt across a colorful low-poly course on a floating island, try to sink the ball in as few strokes and as little time as possible, compete on that post's leaderboard, and keep a daily streak going.

## How to play

1. Open a Golferit post and tap **Play**.
2. **Press anywhere, pull back, release.** The arrow shows direction, and its length and color (green → red) show power.
3. Get the ball in the cup in as few strokes as you can:
   - A ball that rolls over the cup too fast skips across it.
   - Water or out of bounds costs **+1 stroke**, and the ball goes back to where you shot from.
   - Moving obstacles (windmill blades, sliders, spinners) can block your shot, so timing matters.
   - On a bridge you're safe; roll off it and you're in the water.
   - Sand slows the ball right down. Boost pads push it along their arrows. Roll into a teleporter and the ball pops out of its twin, still moving the same way.
   - The hole ends after 10 strokes.
4. Use the **+ / −** buttons to zoom. Zoomed in, the camera follows the ball; **⤢** shows the whole course again. Buttons are used instead of pinch so a zoom can never be mistaken for a putt.
5. Your score is saved if you're logged in to Reddit. Tap 🏆 to see the leaderboard.

**Daily streak:** finish the day's challenge on that day (UTC) to extend your streak 🔥. Replaying the same day doesn't add to it, older dailies and practice posts don't count, and missing a daily resets it. Days with no daily (paused by the moderators) don't break a streak.

**Ranking:** fewest strokes first, then fastest time. The timer starts at your first putt and stops when the ball drops in.

## Features

- Ten built-in holes, easiest first: **Bumper Lane**, **Sandy Shore**, **Plank Crossing**, **Speedway**, **Ramp Rally**, **Tunnel Run**, **Spin Cycle**, **Warp Garden**, **Windmill Way**, **Grand Tour**. Each is drawn as an editor design, so a player could build every one of them.
- Three.js low-poly look: floating islands, wooden walls, water, soft shadows, a fixed isometric camera with button zoom
- Daily challenge post at 00:00 UTC once a moderator starts it, rotating through the holes, plus daily streaks
- Rapier physics with a fixed 120 Hz step (the same result on every device's frame rate)
- Works with mouse and touch; responsive from 360 px phones to desktop
- Server-timed and server-validated scores, personal bests, and a leaderboard per post (Devvit Redis)

## Joining the subreddit

The splash shows a **＋ Join r/…** button to logged-in viewers. It calls `reddit.subscribeToCurrentSubreddit()` as the user, so it always joins **whichever subreddit the app is installed in**: the test sub during development, the public sub after launch, with no code change. This requires `"asUser": ["SUBSCRIBE_TO_SUBREDDIT"]` under `permissions.reddit` in `devvit.json`.

Reddit doesn't let apps read a user's subscriptions, so the app remembers who joined through the button (`joined:<userId>` in Redis) and shows "✓ Joined" from then on. Someone who joined another way still sees the button; tapping it is a harmless no-op.

## Course editor

Tap **🛠 Build your own course** on any Golferit post to open the editor.

- **Paint** track and water on a 10 × 14 grid. Walls are generated around the track automatically.
- **Place** the tee, the cup and obstacles: bumpers, angled walls, ramps, tunnels, boost pads, teleporters, spinners, windmills and sliders, plus bridges (on water) and sand traps. Tap a placed obstacle again to turn it. Teleporters come as one pair.
- **Undo** steps back one stroke at a time. Drafts **autosave to the server** (one per player), so they survive app updates and follow you across devices.
- The status bar explains anything that would stop the course from working: no tee or cup, disconnected track, tiles touching only at a corner, track surrounding empty space, and so on.
- **▶ Test** plays the draft in the real 3D engine. Nothing is submitted to any leaderboard. Sink the ball to **verify** the course; any edit clears the verification.

- **Publish** appears once you've sunk the ball. It posts the course to the subreddit as a **community course**, credited to you, with its own leaderboard.

### Publishing

| Step     | What happens                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Verify   | You sink the ball in **▶ Test**. The winning shot log is kept with the exact layout it was played on.                                                                                            |
| Publish  | The server rebuilds the course from the design and checks your shot log against it. A broken course or a forged run is rejected.                                                                 |
| Post     | The app account creates the post, titled `<name> by u/<you> · Par <n>`. The whole design is stored in the post's data (≤ 1.2 KB of the 2 KB limit), so the course is frozen and loads instantly. |
| Cooldown | One publish per player every 5 minutes.                                                                                                                                                          |

Community courses don't count toward streaks. Moderators remove them like any other post.

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

Installing the app posts nothing. Daily challenges start when a moderator uses **Post today's daily challenge** for the first time (or **Resume daily challenges**). From then on a scheduled task posts a new one every day at 00:00 UTC. Moderators also get these subreddit menu items (**⋯ menu**):

- **Post today's daily challenge**: the first time, posts daily #1 and starts the daily schedule. After that it's a fallback if the scheduled task hasn't run yet (it never posts twice for one day).
- **Pause daily challenges** / **Resume daily challenges**: stop or restart the automatic daily post. Resume also starts the schedule if nobody has yet (first post at the next 00:00 UTC). While paused, **Post today's daily challenge** still works for a one-off. Numbering carries on where it stopped: pause after #3 and the next daily is #4.
- **Create a practice post**: opens a form listing every hole. Pick one to create a free-play post for it (its own leaderboard, no streak). Handy for trying out any hole.

## Commands

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Live playtest on Reddit (`devvit playtest`) |
| `npm run build`      | Build client and server into `dist/`        |
| `npm run test:types` | TypeScript type check                       |
| `npm run lint`       | ESLint                                      |
| `npm run test`       | Unit tests (same as `test:unit`)            |
| `npm run test:unit`  | Unit tests (`src/**/*.test.ts`)             |
| `npm run deploy`     | Type check, lint, then upload a new version |
| `npm run launch`     | Deploy and publish for review               |

## Testing

```bash
npm run test                                     # all unit tests
npm run test -- --test-name-pattern=parseDesign  # only matching tests
```

Tests use Node's built-in runner (`node:test` + `node:assert/strict`). No extra dependencies. Test files sit next to the code as `*.test.ts`. Node runs the TypeScript directly.

Source files import without extensions (`./geometry`). `tools/test-resolve.mjs` is a resolve hook that retries those with `.ts`, then `/index.ts`. Test files import with explicit `.ts` and are type-checked by `tools/tsconfig.test.json`.

| Module                               | What's covered                                                     |
| ------------------------------------ | ------------------------------------------------------------------ |
| `shared/scoring.ts`                  | Score packing round-trip, strokes beat time, time clamp, duration  |
| `shared/daily.ts`                    | UTC date keys, challenge numbers, course rotation, post data       |
| `shared/course/rules.ts`             | Cup capture, bridges, water, out of bounds, stroke limit, labels   |
| `shared/course/geometry.ts`          | Point in polygon, area, bounds, offsets, wall segments             |
| `shared/course/obstacles.ts`         | Moving-obstacle timing, ramp height, sand, boost pads, teleporters |
| `shared/editor/design.ts`            | Grid helpers, immutability, starter design, `parseDesign` rejects  |
| `shared/editor/buildCourse.ts`       | Every item builds; bridges join; each invalid design has its error |
| `server/services/roundValidation.ts` | Request parsing, round plausibility checks                         |
| `shared/courses`                     | Ten in rotation, retired holes still resolve, tee/cup/par sanity   |

Only pure logic is unit tested. Rendering (Three.js), physics (Rapier), Redis and Devvit APIs are checked by playtesting with `npm run dev`.

## Project structure

```
src/
  shared/          Code used by both client and server
    types/         Course data model (plain JSON-serializable data)
    courses/       The built-in holes (designs.ts), the catalog, retired/ old holes
    constants/     Dimensions and rules
    course/        Geometry, game rules, moving-obstacle timing
    daily.ts       Daily rotation, post data, date helpers
    editor/        Editor design model and design → course builder
    scoring.ts     Score packing (strokes + time) and time formatting
    api.ts         Request/response types
  client/          Runs in the iframe on reddit.com
    splash.tsx     Lightweight feed preview (no Three.js)
    game.tsx       Full-screen game entry
    editor.tsx     Course editor entry (3D loads only for test play)
    editor/        Editor screen, grid, tools, test play
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

**Retired holes stay resolvable.** The first four holes (Meadow Mill, Bridge Bay, Slider Alley, Tunnel Twist) are out of the rotation and the practice menu, but `getCourseById` still finds them, so posts created on them keep opening the hole their scores were set on.

**Editor designs build real courses.** A design is a tile string plus a list of items. `buildCourseFromDesign` traces the track's edges into the wall outline, turns water regions into ponds set slightly in from the walls, sizes each slider to its corridor, and adds scenery. It's pure and shared, so the client previews with it and the server can re-run it before anything is published.

**Dailies count up, not by date.** Each subreddit keeps a counter of posted dailies (`dailyCount`), and daily #n plays the nth hole of the rotation. Each daily also records the date of the one before it (`dailyPrev:<date>`), which is what streaks check, so paused days neither skip numbers nor break streaks. Subreddits from before the counter carry on from their old date-based number. The scheduler, the install trigger and the moderator menu all go through one function that creates at most one post per day.

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
| `GET /api/editor/draft`  | Your saved editor draft (logged in)                                      |
| `POST /api/subscribe`    | Join the subreddit the app is installed in (as the user)                 |
| `PUT /api/editor/draft`  | Save your editor draft (structure-checked)                               |

## Things to know

- **Logged-out viewers** can play and see the leaderboard, but scores aren't saved. They can also try the editor and test-play what they build, but a banner tells them up front that nothing will be saved, and **Publish** is replaced by a disabled "Log in to publish".
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
- [x] Course editor (track, water, obstacles, test play, server drafts)
- [x] Publish community courses as posts
- [ ] Moderator featuring of community courses into dailies
- [ ] Creator rankings
- [ ] Ramps and elevation
- [ ] Server-side replay validation

## License

BSD-3-Clause. See [LICENSE](LICENSE).
