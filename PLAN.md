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

## Blocked: Nova shared-file limits

Nova's shared-file limits are set in
`~/code/rocketcrab/packages/protocol/src/limits.ts`. Today they are 256 KiB
per file, 32 files and 1 MiB in total per session.

- **How the budget works:** it's live. Removing a ref from state frees its
  space, and uploads still waiting to be referenced count against it.
- **Why it's too small:** a round keeps n × (drawings per chain) drawings
  referenced at once. That's about n²/2 at the maximum turns, for example
  648 drawings for 36 players × 36 turns.
- **Ask Tanner for:**
  - `gameFilesMax` raised to about 1,024–4,096.
  - `gameFilesTotalBytes` raised to about 4 MiB, or 8 MiB to keep full
    quality at 64 players × 64 turns.
  - 256 KiB per file kept.
  - Optionally, the limits exposed to games at runtime.
- **What's blocked:** only `maxPlayers: 64` and supporting large games. Until
  the limits change, build step 6 against the current values. Keep them as
  constants in one module that the budget math reads, so only those
  constants change later.

## 1. Branches

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
  - **Before step 6:** serve Express and Socket.IO through Vitest's dev
    server so the iframes are same-origin. Players join with
    `?rocketcrab=true&code=…&name=…`, using a code from `POST /new`.
  - **After step 6:** the page provides each frame a fake `window.nova`. It
    runs the handlers once, broadcasts the state, and implements players,
    `leaderId`, `playerJoined`, `playerLeft` and `files`.
- **Browser cases:**
  1. A full 3-player word-pack game: each player draws on the canvas with
     pointer events and guesses, and everyone sees correct results.
  2. The same game with "Players write first word".
  3. Results are saved to the archive and the archive shows them, including
     an old record whose drawings are SVG data URLs.

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
  `Drawphone`, `apiVersion: 1` and `maxPlayers: 64` (see Blocked). It needs:
  - a lobby phase for settings, the rounds, and a results phase with play
    again
  - leader-only settings: word pack, time limit, turn limit, "Players write
    first word" and a toggle for the 13+/18+ word packs (off by default)
  - turn limits allowed up to the full range `getNewTurnLimit` gives, with
    no limit based on player count
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
  - Drawings are file refs.
  - The per-drawing byte budget is stored in state.
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
- **Unfinished drawings:** save the canvas (Fabric `toJSON`) to
  `localStorage` while drawing, keyed by player id and turn, and restore it
  after a reload.

### Drawings

- **Submit:**
  1. Build the SVG with Fabric's `toSVG()`, replacing each path's data with
     `pathToString(optimizePath(path.path, 1))` from `svg-path-commander/util`.
     Use the full-precision path array from the Fabric object. Already-rounded
     `d` strings stop the `T` shorthand from working.
  2. Gzip it with fflate's `gzipSync`.
  3. Check the size against the budget.
  4. Call `nova.files.put(new Blob([bytes], { type: "application/gzip" }))`.
  5. Dispatch the submit action with the ref. It must land within 10
     seconds; a retry uploads again first.
  6. If the upload or dispatch fails, keep the drawing on screen, show the
     reason and offer a retry.
- **Ink limit:**
  - Keep a running encoded size.
  - When the next stroke would go over the budget, stop accepting strokes
    and tell the player the canvas is full.
  - Show a meter once 80% is used.
- **Budget** (computed by the handler when each round starts): the smaller of
  the per-file limit and 0.9 × the total-byte limit ÷ (drawings this round +
  players). This needs drawings + players ≤ the file-count limit.
- **Display:**
  1. `nova.files.get(ref)`, then `gunzipSync`, then an `image/svg+xml` Blob,
     then `URL.createObjectURL`, then `<img>`.
  2. Only request what's on screen, so Nova's priority fetch loads it first.
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
