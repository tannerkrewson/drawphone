![Drawphone](https://i.imgur.com/UDwA90p.png)

### Play now at: [drawphone.tannerkrewson.com](https://drawphone.tannerkrewson.com/)

Drawphone was built with Node.js, jQuery and [Pug](https://github.com/pugjs/pug). It was one of my first coding projects, so the code is a bit of a mess... 😂

Issues, feature requests, and pull requests welcome!

## Development

#### Instructions

1. Clone the repo to get started
2. Fork and create any pull requests against the `dev` branch
3. Install Node.js **22.23.4** (npm **10.9.9**). With [mise](https://mise.jdx.dev/), run `mise install` and use `mise exec -- npm ci`. Optional `node-canvas` may attempt a native build; it is not used by the server (Fabric is bundled for the browser).
4. Run `npm ci`, `npm run build:prod`, then `npm start` to launch the server (or `npm run dev` for watch mode)
5. Go to `localhost:3000` in your browser

#### Runtime security

Node 22.23.4 is the minimum patched Node 22 release for [CVE-2026-111497](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases); the [release notes](https://nodejs.org/en/blog/release/v22.23.4) explicitly include the Brotli decoder fix. Keep `package.json`, the root engines in `package-lock.json`, `mise.toml`, and CI aligned when changing the runtime. Node 22 is supported until April 30, 2027; plan its next runtime upgrade before then.

The locked body-parser 1.19.1 rejects incoming Brotli JSON/form bodies (415), but Got 12 automatically decompresses Brotli responses from the image-search APIs. Do not treat unsupported incoming compression as eliminating exposure or disable decompression as a substitute for patching Node.

Local checks: `npm run lint`, `npm run build:prod`, and `npm test -- --runInBand`. The existing Jest suite warns about open handles and can take about a minute to exit; webpack reports existing bundle-size warnings. Optional canvas 2.6.1 is not installed on the tested Node 22 Linux environment; server startup and the browser bundle build succeed without it.

Deployment uses the pinned official Node buildpack in `.buildpacks` and an off-host herokuish image build. `heroku-postbuild` generates assets before pruning; `npm start` only starts the server. The `prod` workflow builds a downloadable image artifact, **not an automatic production deployment**. See [the deployment runbook](docs/deployment.md) for build, transfer integrity checks, source backup, rollback and the required serialized production slot. Runtime pinning does not resolve the project's other dependency audit findings.

#### Tips

-   To change the default port, set the `PORT` environment variable
-   If you set the `NODE_ENV` environment variable to `development`, you can use the link `localhost:3000/dev` to automatically join game `ffff`. This is helpful for speeding up debugging.
