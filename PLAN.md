# Drawphone production cutover

Dokku serves the current version until the GitHub Pages and rocketcrab cutover.
The Pages workflow is gated by the `DRAWPHONE_PAGES_ENABLED` repository variable.

- Set `DRAWPHONE_PAGES_ENABLED` to `true` when ready to publish and run
  the workflow on `main`.
- Publish Pages and verify that `drawphone.html` returns
  `Access-Control-Allow-Origin: *`. Set the custom domain in GitHub Pages
  settings and point `drawphone.tannerkrewson.com` to GitHub Pages in
  Cloudflare as part of the same cutover as the rocketcrab catalog deploy.
  The available Cloudflare session has Zone Read and needs DNS Edit access
  for `tannerkrewson.com`.
- Deploy the rocketcrab catalog update that moves Drawphone into
  `NOVA_GAMES` and removes the two legacy Drawphone entries. The catalog
  update is committed locally on rocketcrab’s `main` and deploys on push.
- Verify that rocketcrab launches a round and that the public archive still
  opens at `/archive`. Stop the Dokku app, then delete or redirect the
  `dpk` DNS record.

## Deferred

- Results saved in the old rocketcrab iframe use that iframe's partition of
  browser storage. Retrieving them requires a Drawphone frame directly inside
  a rocketcrab.com page. The public archive can still read records saved on
  the Drawphone site itself.
- The current player's name labels the seat in live results, including
  for links submitted before the replacement joined.
