# Plan: turn Drawphone into a static Nova game

## Where things stand

- **Today:** an Express + Socket.IO server with a jQuery and Pug client,
  bundled with webpack and deployed to Dokku from the `prod` branch.
- **How people play:** rocketcrab.com (Nova) loads
  `drawphone.tannerkrewson.com` in an iframe. The `drawphone` and
  `drawphone-kids` entries in
  `~/code/rocketcrab/apps/nova/src/lib/catalog/external-games.ts` create
  games through `POST /new`.
- **Goal:** a single-file hosted Nova game on GitHub Pages at
  `drawphone.tannerkrewson.com`, with no server.
- **Starting point:** this plan and `AGENTS.md` are on branch `docs/plan`,
  which branches from `origin/prod`. `dev` is out of date; work from `prod`.
- **Deploys:** don't deploy anything to Dokku. It keeps running the current
  version until the cutover in step 7.
- **Git hook:** the old husky pre-commit hook fails because Prettier finds no
  `**/*.ts` files. Use `--no-verify` until lefthook replaces it in step 4.

## Nova shared-file limits

From `~/code/rocketcrab/packages/protocol/src/limits.ts`:

- **One budget:** all of a game's files together share
  `gameFilesTotalBytes`, 2 MiB (the same as a game's HTML). There is no
  per-file or file-count limit.
- **What counts:** each file costs its size plus a 37-byte header and its
  MIME type. While an upload is in flight, Nova reserves room for the
  longest MIME type (127 bytes), so budget 164 bytes of overhead per file.
- **Live accounting:** removing a ref from state frees its space. An upload
  counts as soon as it's stored, and is dropped if no state references it
  within 10 seconds.
- **Upload rate:** each player averages 256 KiB/s; after a large upload the
  next one waits. Drawings are far below that.

What it means for Drawphone:

- **Drawings are stored as strokes** (see Drawings), about six times smaller
  than gzipped SVG. In a simulation of freehand strokes, a quick doodle
  was about 0.15 KB, a typical drawing 0.5 KB, a detailed one 2 KB and a very
  detailed one 6 KB.
- **Unused space carries forward:** each turn's per-drawing limit is the free
  space divided by the drawings left in the round. Most drawings use far
  less than their share, so the limit grows during a round. It never
  shrinks: a turn spends at most its share of what's free, so every later
  share is at least as large. Nobody gets less than an equal split of
  2 MiB, about 85 KB at 6 players, 3 KB at 36 and 830 bytes at 64 with full
  turn ranges.
- Keep the limit and the 164-byte overhead as constants in one module, with
  a comment pointing at `limits.ts`. Nova doesn't expose them to games at
  runtime.

## 1. Branches

Implementation commits go directly on the current base, `docs/plan`,
which descends from `origin/prod`. Apply the remote branch changes with
the production cutover, after verifying the Pages artifact.

1. Fast-forward `prod` to `docs/plan`.
2. Rename `prod` to `main` on GitHub and make `main` the default branch.
3. Delete these branches: `dev`, `ai`, `security/node22-brotli`,
   `es5-to-es6`, `tape` and every `dependabot/*` branch.

## 2. Tests (Vitest)

- Replace Jest with Vitest. Port `server/app/drawphone.test.js` (pass order
  and chain uniqueness) and `shared/util.test.js`.
- Add a test that the word packs load and that the 13+/18+ filter works.
- **Browser tests:** Vitest browser mode (`@vitest/browser-playwright`,
  headless Chromium), with one test page holding one iframe per player.
  - In the static build, the page provides each frame a fake `window.nova`. It
    runs the handlers once, broadcasts the state, and implements players,
    `leaderId`, `playerJoined`, `playerLeft` and `files`.
- **Browser cases:**
  1. A full 3-player word-pack game: each player draws on the canvas with
     pointer events and guesses, and everyone sees correct results.
  2. The same game with "Players write first word".
  3. Results are saved to the archive and the archive shows them, including
     an old record whose drawings are SVG data URLs.
- **Unit cases:** a drawing survives encode and decode within 1 px, and the
  turn limit never shrinks during a round when every drawing uses its full
  limit.

## 3. Cleanup

Remove:

- **AWS archive:** `server/app/aws-archive.js`, `aws-sdk` and
  `shouldArchiveResultsToAws`.
- **Admin and locking:** the `/admin`, `/lock` and `/stats` routes,
  `admin.pug`, the lock code in `Drawphone` and `sendLockedError`.
- **Dokku and Heroku:** `scripts/`, `docs/deployment.md`, `.buildpacks`,
  `.github/workflows/deploy.yml`, the `heroku-postbuild` script and the
  deployment and runtime-security sections of the README.
- **Join and new-game menus:** `joinmenu.js`, `newmenu.js`, their markup in
  `index.pug` and the `newGame` socket handler. Keep `POST /new` until
  step 6, because the tests use it.
- **Dev mode:** the `/dev` route, the `ffff` game and `devModeEnabled`.
- **Drawphone for Kids:** the `dpk` hostname check (`getAllPackNames(true)`
  for `dpk*` hosts).
- **Unused tooling:** `blueimp-canvas-to-blob`, `.vscode/`, and the husky and
  lint-staged config.
- **Bots and ml5, for now:** `player-ai.js`, `ai-guess-queue.js`, the ml5
  classify code, the `makeAIGuess` handler, the bot and ghost UI, and the
  `ml5` and `got` packages. Tanner will rewrite bots later, and git history
  keeps the old version.

## 4. Tooling

- **Node:** delete `mise.toml`, add `.nvmrc` with `26.13.1`, set
  `"engines": { "node": ">=26" }`, and point CI at
  `setup-node` with `node-version-file: .nvmrc`.
- **Vite instead of webpack:**
  - A small Vite plugin compiles `server/views/*.pug` at build time.
  - Load the word lists with `?raw` imports.
  - Until step 6, Express serves the Vite build instead of reading
    `webpack-assets.json`.
  - Remove webpack, its loaders and plugins.
- **Formatting and linting:** oxfmt replaces Prettier (`tabWidth: 4`, as in
  `.prettierrc`). oxlint replaces ESLint, with the equivalent of
  `eslint:recommended`. lefthook's pre-commit runs the format check, lint and
  tests. If oxfmt changes any formatting, follow the reformat rule in
  `AGENTS.md`.
- **TypeScript:** add a `tsconfig.json` with `allowJs` and no `checkJs`. Type
  checking applies to `.ts` files only.
- **CI:** update the action versions and run format check, lint, tests and
  build.
- **Google Analytics:**
  - Replace the analytics.js snippet in `layout.pug` with `gtag.js` for
    `G-4TYBH23GSK` (the "Drawphone - GA4" property, `properties/386704846`).
  - Add a `window.ga` shim so the existing calls stay unchanged:
    - `ga("send", "event", category, action, label, value)` becomes
      `gtag("event", action, { event_category, event_label, value })`.
    - An `exception` hit becomes an `exception` event.
    - Page views are automatic.
  - Load it only when the hostname is `drawphone.tannerkrewson.com` or
    `rocketcrab-runtime.tannerkrewson.workers.dev`. Forks with the old ID
    still send events.
  - GA4 already receives the UA action names, spaces included, with
    `event_category` and `event_label` set up as custom dimensions. Keep
    those names.

## 5. Dependency upgrades

- **jQuery 4** and **Pug 3.0.3.**
- **Dexie 4:** must keep opening the existing `DrawphoneDatabase`
  (`version(1)`, `archive: "++id,date,chains"`) unchanged.
- **Fabric 7.4:** update `canvas.js` to named ESM imports, an explicitly
  created `PencilBrush`, and the promise-based `loadFromJSON`.
- **Bootstrap:** stays on 4.6.2.
- **Kept, updated to their latest versions:** `bootstrap-sweetalert`,
  `knuth-shuffle`, `striptags` and `@fortawesome/fontawesome-free` (only
  three of its SVGs are used, so inlining them is fine).

## 6. Nova conversion

### Game logic

- Add a new `.ts` module that calls `nova.defineGame` with title
  `Drawphone`, `apiVersion: 1` and `maxPlayers: 64` (see Nova shared-file limits). It needs:
  - a lobby phase for settings, the rounds, and a results phase with play
    again
  - leader-only settings: word pack, time limit, turn limit, "Players write
    first word" and a toggle for the 13+/18+ word packs (off by default)
  - allow the full turn range given by `getNewTurnLimit` without an extra
    drawing-budget cap on turns
- Reuse the surviving logic by editing it in place: the row-complete Latin
  square in `round.js`, `getNewTurnLimit`, the chain-length rules (odd final
  link count, offset when players write the first word, 6-link demo mode
  for one player) and `words.js` (with `?raw` imports instead of `fs`).
  Delete files that only exist for sockets: `server/app.js`, `bin/`,
  `routes/`, the server `drawphone.js`, `player.js` and similar.
- **Compact state:**
  - Seats are an ordered list of player ids, and each link stores a seat
    index.
  - Guesses are capped at 50 characters and run through `stripTags`.
  - Drawings are file refs, each with its byte size.
  - The current turn's per-drawing limit is stored in state.
- **Leader:** reject leader-only actions unless
  `context.actor.id === context.leaderId`. Show the controls only when
  `nova.player.id === nova.leaderId`. Remove the kick button.
- **Players:**
  - `playerJoined`: add the player in the lobby. Mid-round, give them the
    first vacant seat, or wait for the next round.
  - `playerLeft` (after Nova's 20-second grace period): remove the player in
    the lobby. Mid-round, mark their seat vacant.
  - A reload keeps the same id, so the player keeps their seat.
- **Skip a vacant seat:** a leader action. That seat's turns are filled with
  a random word from the pack, or a "player left" link with no file for
  drawings. Results show these as skipped.

### Client

- Add a new `.ts` adapter. It turns `nova.state.onChange` into the old screen
  events (`updatePlayerList`, `nextLink`, `viewResults`, `updateWaitingList`,
  `showWaitingList`) and turns `emit` into `nova.dispatch`. Keep the screens
  as unchanged as possible.
- **Remove:** the main menu, the replace screen, "Leave Game" and every
  socket dependency (`express`, `socket.io`, `socket.io-client`, `morgan`,
  `cookie-parser`, `body-parser`, `debug`, `nodemon`, `npm-run-all`,
  `cross-env`).
- **Render immediately:** show the lobby or "waiting for the party" and the
  archive before `onStart`, plus a small connection-status chip.
- **Untrusted text:** names and guesses are untrusted. `results.js`, the lobby
  and the waiting list build HTML strings, so insert those values with
  `textContent`.
- **Unfinished drawings:** save the stroke records to `localStorage` while
  drawing, keyed by player id and turn, and restore them into the canvas
  after a reload with the same rebuild code.

### Drawings

- **Stroke format:** one record per stroke, `{ color, width, points }`,
  where `points` comes from:
  1. The points Fabric's `PencilBrush` recorded, which are the control
     points of the path it creates.
  2. `simplify(points, 1, true)` from `simplify-js`, which keeps the stroke
     within 1 px.
  3. `polyline.encode(points, 0)` from `@mapbox/polyline`: whole-pixel
     differences from the previous point, a few characters each.

  A drawing is the JSON array of its records, compressed with fflate's
  `deflateSync` at level 9. Rebuild paths with the smoothing function
  `PencilBrush` itself uses (`util.getSmoothPathFromPoints` in Fabric 6;
  check the name in 7.4), so a drawing looks the way it was drawn. The
  encode and rebuild code is the only custom part.
- **Submit:**
  1. Encode the drawing.
  2. Call `nova.files.put(new Blob([bytes]))`. Leave the MIME type empty;
     it only costs header bytes.
  3. Dispatch the submit action with the ref and the byte size. It must land
     within 10 seconds; a retry uploads again first, which reuses the same
     ref because the bytes are the same.
  4. If the upload or dispatch fails, keep the drawing on screen, show the
     reason and offer a retry.
- **Ink limit:**
  - After each stroke, encode the drawing (fflate is synchronous) and
    compare its size with the turn's limit.
  - If a stroke takes the drawing over the limit, remove that stroke, stop
    accepting new ones and tell the player the canvas is full.
  - Show a meter once 80% is used.
- **Turn limit:** when each turn starts, the handler sets
  `floor((2 MiB − bytes referenced) ÷ drawings left in the round) − 164`
  and stores it in state. Drawings left includes the turn that's starting.
  Its own pending uploads are those drawings, so they need no separate
  reserve.
- **Display:**
  1. `nova.files.get(ref)`, then `inflateSync`, then rebuild the paths into
     an SVG string, then an `image/svg+xml` Blob, then
     `URL.createObjectURL`, then `<img>`.
  2. Only request what's on screen. Nova copies every referenced file to
     every device in the background and fetches one directly when a `get`
     waits on it, so the current turn's drawing never queues behind results.
  3. Show a placeholder while loading and a clear error if it fails.
  4. Revoke the URLs when a round resets.
- **Archive and rounds:**
  - After results, fetch every drawing and save the chains to Dexie with
    drawings as SVG data URLs, the same format as old records.
  - Drop the previous round's refs when the next round starts. "View Last
    Round's Results" works until then.
- **Archive screen** inside the game, with an "Older results" link that opens
  `https://drawphone.tannerkrewson.com/archive` in a new tab.

### Build

- Use `vite-plugin-singlefile` to produce one HTML file of at most 2 MiB with
  CSS, fonts and icons inlined. Anything remote needs an absolute URL. Don't
  load a Nova SDK. `nova.defineGame` must run within 10 seconds.
- Also build static pages for GitHub Pages: a landing page that links to
  rocketcrab, `how-to-play`, and `archive`. The archive page reads
  `DrawphoneDatabase` on `drawphone.tannerkrewson.com` itself, so old results
  stay viewable.

## 7. Deploy and cutover

- **GitHub Pages workflow** from `main`, with a `CNAME` of
  `drawphone.tannerkrewson.com`. Output:
  - `/index.html`
  - `/how-to-play.html` (served as `/how-to-play`)
  - `/archive.html`
  - `/drawphone.html` (the Nova game)

  Pages already sends `Access-Control-Allow-Origin: *`, which Nova needs.
- **Cutover, all at once:**
  1. In Cloudflare DNS, point `drawphone` at GitHub Pages.
  2. In rocketcrab, add a `NOVA_GAMES` entry in `nova-games.ts`: the
     `drawphoneBase` listing with
     `play: { kind: "nova", url: "https://drawphone.tannerkrewson.com/drawphone.html" }`.
  3. Remove the `drawphone` and `drawphone-kids` external entries and
     `drawphoneOrigins`.
  4. Shut down the Dokku app.
  5. Delete or redirect the `dpk` DNS record.
- **README:** describe GitHub Pages, Nova and local development, and drop
  the `dev` branch instructions.

## Deferred

- Results saved inside rocketcrab's iframe are in that iframe's own storage,
  which only a `drawphone.tannerkrewson.com` frame placed directly on a
  `rocketcrab.com` page can read. Dropped for now.
