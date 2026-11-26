# Drawphone production cutover

The static Nova port is on `docs/plan`, based on `origin/prod`. Dokku serves
the current version until the GitHub Pages and rocketcrab cutover.

- Verify the built Pages artifact and test the game in a Nova party.
- Fast-forward GitHub's `prod` to the implementation, rename it to `main`,
  and set `main` as the default. Enable GitHub Actions as the Pages source.
- Publish Pages and verify that `drawphone.html` returns
  `Access-Control-Allow-Origin: *`. Set the custom domain in GitHub Pages
  settings and point `drawphone.tannerkrewson.com` to GitHub Pages in
  Cloudflare as part of the same cutover as the rocketcrab catalog deploy.
- Deploy the rocketcrab catalog update that moves Drawphone into
  `NOVA_GAMES` and removes the two legacy Drawphone entries.
- Verify that rocketcrab launches a round and that the public archive still
  opens at `/archive`. Stop the Dokku app, then delete or redirect the
  `dpk` DNS record.
- Delete GitHub branches `dev`, `ai`, `security/node22-brotli`, `es5-to-es6`,
  `tape`, and every `dependabot/*` branch once the cutover is verified.

## Deferred

- Results saved in the old rocketcrab iframe use that iframe's partition of
  browser storage. Retrieving them requires a Drawphone frame directly inside
  a rocketcrab.com page. The public archive can still read records saved on
  the Drawphone site itself.
- The current player's name labels the seat in live results, including
  for links submitted before the replacement joined.
