# Off-host Drawphone image deployment

## Why this path

The shared 2 GB production host must not compile webpack. The frozen Node inventory in its installed herokuish image cannot resolve patched Node 22.23.4. `.buildpacks` pins the official Node buildpack to immutable commit `2d8736ee6d8417530b8ec99d9fcd550f323d87fc`; it verifies the official Node archive SHA-256. No host/global build system upgrade is required.

`scripts/build-image.sh` uses the exact current Ubuntu 24.04 herokuish image digest, builds committed files only, with no production configuration/secrets, under the shared local `flock /tmp/dokku-cve-offhost-build.lock`. It requests 3 GB RAM and 2 CPUs. The measured complete build cgroup peak was about 2.78 GiB (includes filesystem cache); this is not a production-safe build budget. Runtime smoke tests used about 101 MiB peak under a 512 MiB limit; this is not a production load guarantee.

Webpack runs exactly once through `heroku-postbuild` before pruning. Assets and the generated `Procfile` persist. The final Docker-format image retains the herokuish filesystem, resets ENTRYPOINT to `/start`, CMD to `web`, exposes 5000, and labels the source revision. The empty build-time config profile is removed; no production environment is fetched or baked in. Existing Dokku runtime settings are injected at deployment. Do not introduce build-time dummy values that override real runtime config.

## Build and verify (off-host only)

1. Review and commit the scoped patch on the production-based security branch.
2. `bash scripts/build-image.sh "$HOME/.cache/drawphone-cve-build/release-UNIQUE"` (disk-backed storage only; the default is a revision-named directory there). Never place multi-GB archives or build working files in RAM-backed `/tmp`. The script rejects tmpfs output, checks local memory, and stops its own running build on a handled abort before releasing the shared lock. Use a sufficiently long harness timeout; after any unhandled crash, inspect the named container before starting another build.
3. Inspect `image.id`, `image.tag`, `source.commit`, and validate `image.tar.sha256`. Smoke-test the exact resulting image with `/start web`, runtime configuration containing no secrets, and a local port before proceeding.
4. The `prod` GitHub workflow performs this build and uploads the directory as an artifact. It **does not deploy or use SSH secrets**. The old direct git-push-to-Dokku action was removed to prevent accidental droplet compilation. Download/unpack the artifact and use the same deployment script below. A manual-dispatch workflow is discoverable only once present on the repository default branch; until then use the local script or the `prod` push build. No new credentials or registry are needed. GitHub requires Actions artifact-download access; production deployment uses the admin's existing root SSH access, not the old `PRIVATE_KEY` action secret.

## Production slot only

Do not run this concurrently with other app deployments. Recheck other apps, available memory/disk, and the existing running image immediately before the slot. No host upgrades, pruning, unrelated restarts or firewall changes.

`bash scripts/deploy-image.sh "$HOME/.cache/drawphone-cve-build/release-UNIQUE" root@134.209.222.77`

The script:

- checks the local archive checksum and host headroom (at least twice the uncompressed archive size plus a 2 GiB reserve, minimum 6 GiB disk; 400 MiB available RAM); rechecks disk after transfer and both disk and memory after loading; these are gates, not guarantees;
- requires strict SSH host verification and existing non-interactive admin credentials; no host-key bypass;
- transfers a uniquely named archive and verifies its SHA-256 again on the host;
- launches the long import/deploy in a transient `systemd-run` service, with a private `/root/drawphone-deploy-TIMESTAMP/output.log` and atomic `exit` marker; SSH/tool interruption does not terminate the deployment; always reconcile this job and actual containers before retrying;
- records the original effective app port/proxy reports, explicitly pins those same mappings before import and verifies them afterward; never infer public routing from image `EXPOSE` (Drawphone's observed original mappings are `http:80:5000 https:443:5000`, with app `PORT=5000`; the script reads them afresh);
- requires an existing `prod` ref, creates and verifies a full source Git bundle in that private job directory;
- protects the actual old running image with `dokku/drawphone:rollback-TIMESTAMP` and verifies its image ID;
- uses `docker load`, then verifies the exact loaded image ID and source label;
- invokes `dokku git:from-image drawphone UNIQUE_IMAGE_TAG`, then re-verifies the rollback tag is still addressable (retagging it from the preserved old image ID if needed); a live deployment without a usable rollback fails the job with a critical warning;
- removes only its successfully consumed archive, never images or other apps' files.

Official Dokku 0.36.3 [image deployment documentation](https://github.com/dokku/dokku/blob/v0.36.3/docs/deployment/methods/image.md) and its `plugins/git/git-from-image` implementation specify a generated Dockerfile with `FROM IMAGE`. This **replaces the app's deploy branch contents**, hence the bundle backup. It performs a tiny FROM/label-only image build, **not application compilation**. Local images skip a registry pull. The GitHub source repository remains unchanged. Dokku's scheduler detects the herokuish-based image, uses its `/start` and generated `Procfile`, and retains app configuration, routing and scale. Do not assume `GIT_REV` is the application commit after importing; use the image revision label and recorded `source.commit`.

## Mandatory post-deploy verification

Find the actual `drawphone.web.1` container. Verify image ID/source label, Node `v22.23.4`, npm `10.9.9` (use `/app/.heroku/node/bin` PATH), logs, public HTTP/assets, a disposable game creation, and a WebSocket handshake. Brotli `1.1.0` is the expected patched backport string. Verify other apps' existing containers remain healthy without creating games on them. Existing in-memory games disconnect on the one-app restart. Never report deployment success based solely on image build/import.

Benign warnings such as "bad revision HEAD" or an openresty include warning may appear during Dokku operations; judge success by the job exit marker, container state and health checks, not by warning text.

Use a tool timeout of at least 700 seconds when invoking the script. If polling times out or SSH disconnects, inspect the printed job path, its `exit` marker/log, transient systemd unit and actual containers; do not rerun speculatively. The remote job continues independently. Successful completion is not health proof.

If deployment fails or original port preservation fails, the script attempts restoration using the protected image. If post-deploy health fails, explicitly restore with `dokku git:from-image drawphone dokku/drawphone:rollback-TIMESTAMP`, then verify actual service health. **The old image restores Node 16 and the vulnerability.** Stop escalation and report. The source bundle is for history recovery, not a reason to force-push or run an unplanned source build. Retain rollback and backup until separately authorized to remove them.
