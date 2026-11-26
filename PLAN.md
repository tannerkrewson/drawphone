# Drawphone production cutover

The live rocketcrab catalog already points Drawphone at
`https://drawphone.tannerkrewson.com/drawphone.html`. Dokku still serves the
public site and returns 404 for that file.

GitHub Pages has published the site from `main` and is configured for
`drawphone.tannerkrewson.com`. The Pages origin serves the landing page,
archive, how-to-play page, and `drawphone.html` with `Access-Control-Allow-Origin: *`.

1. Save the existing DNS record for rollback. Point the Cloudflare DNS
   record for `drawphone.tannerkrewson.com` at `tannerkrewson.github.io` with a
   DNS-only CNAME. This needs DNS Edit access for `tannerkrewson.com`.
2. Check the certificate, enable Enforce HTTPS, and
   recheck the production HTML response and CORS header.
3. Start and join a real party from rocketcrab, finish a round, and download
   a chain PNG. Verify that the public `/archive` opens and reads results
   previously saved on the Drawphone site. Keep Dokku and `dpk` available
   through verification. For a full rollback, restore the old DNS record and
   redeploy the legacy Drawphone entries in rocketcrab’s catalog. Retire the
   old app and delete or redirect `dpk` after cutover.

## Deferred

- Results saved in the old rocketcrab iframe use that iframe's partition of
  browser storage. Retrieving them requires a Drawphone frame directly inside
  a rocketcrab.com page. The public archive can still read records saved on
  the Drawphone site itself.
- The current player's name labels the seat in live results, including
  for links submitted before the replacement joined.
