# Deferred

- Retire the legacy Dokku app and decide where `dpk.tannerkrewson.com` should
  point. For a full rollback before retirement, restore the saved DNS record
  and redeploy the legacy Drawphone entries in rocketcrab’s catalog.
- Results saved in the old rocketcrab iframe use that iframe's partition of
  browser storage. Retrieving them requires a Drawphone frame directly inside
  a rocketcrab.com page. The public archive can still read records saved on
  the Drawphone site itself.
- The current player's name labels the seat in live results, including
  for links submitted before the replacement joined.
