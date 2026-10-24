# Off-host Drawphone image deployment

## Why this path

The shared 2 GB production host must not compile webpack. The frozen Node inventory in its installed herokuish image cannot resolve patched Node 22.23.4. `.buildpacks` pins the official Node buildpack to immutable commit `2d8736ee6d8417530b8ec99d9fcd550f323d87fc`; it verifies the official Node archive SHA-256. No host/global build system upgrade is required.

`scripts/build-image.sh` uses the exact current Ubuntu 24.04 herokuish image digest, builds committed files only, with no production configuration/secrets, under the shared local `flock /tmp/dokku-cve-offhost-build.lock`. It requests 3 GB RAM and 2 CPUs. The measured complete build cgroup peak was about 2.78 GiB (includes filesystem cache); this is not a production-safe build budget. Runtime smoke tests used about 101 MiB peak under a 512 MiB limit; this is not a production load guarantee.

Webpack runs exactly once through `heroku-postbuild` before pruning. Assets and the generated `Procfile` persist. The final Docker-format image retains the herokuish filesystem, resets ENTRYPOINT to `/start`, CMD to `web`, exposes 5000, and labels the source revision. The empty build-time config profile is removed; no production environment is fetched or baked in. Existing Dokku runtime settings are injected at deployment. Do not introduce build-time dummy values that override real runtime config.

## Build and verify (off-host only)

1. Review and commit the scoped patch on the production-based security branch.
2. `bash scripts/build-image.sh /tmp/drawphone-release-UNIQUE`
3. Inspect `image.id`, `image.tag`, `source.commit`, and validate `image.tar.sha256`. Smoke-test the exact resulting image with `/start web`, runtime configuration containing no secrets, and a local port before proceeding.
4. The `prod` GitHub workflow performs this build and uploads the directory as an artifact. It **does not deploy or use SSH secrets**. The old direct git-push-to-Dokku action was removed to prevent accidental droplet compilation. Download/unpack the artifact and use the same deployment script below. A manual-dispatch workflow is discoverable only once present on the repository default branch; until then use the local script or the `prod` push build. No new credentials or registry are needed. GitHub requires Actions artifact-download access; production deployment uses the admin's existing root SSH access, not the old `PRIVATE_KEY` action secret.

## Production slot only

Do not run this concurrently with other app deployments. Recheck other apps, available memory/disk, and the existing running image immediately before the slot. No host upgrades, pruning, unrelated restarts or firewall changes.

`bash scripts/deploy-image.sh /tmp/drawphone-release-UNIQUE root@134.209.222.77`

The script:

- checks the local archive checksum and minimum host headroom (6 GiB disk, 400 MiB available RAM; these are gates, not guarantees);
- transfers a uniquely named archive and verifies its SHA-256 again on the host;
- requires an existing `prod` ref, creates and verifies a full source Git bundle in a private `/root/drawphone-preimage-TIMESTAMP` directory;
- protects the actual old running image with `dokku/drawphone:rollback-TIMESTAMP` and verifies its image ID;
- uses `docker load`, then verifies the exact loaded image ID and source label;
- invokes `dokku git:from-image drawphone UNIQUE_IMAGE_TAG`;
- removes only its successfully consumed archive, never images or other apps' files.

Official Dokku 0.36.3 [image deployment documentation](https://github.com/dokku/dokku/blob/v0.36.3/docs/deployment/methods/image.md) and its `plugins/git/git-from-image` implementation specify a generated Dockerfile with `FROM IMAGE`. This **replaces the app's deploy branch contents**, hence the bundle backup. It performs a tiny FROM/label-only image build, **not application compilation**. Local images skip a registry pull. The GitHub source repository remains unchanged. Dokku's scheduler detects the herokuish-based image, uses its `/start` and generated `Procfile`, and retains app configuration, routing and scale. Do not assume `GIT_REV` is the application commit after importing; use the image revision label and recorded `source.commit`.

## Mandatory post-deploy verification

Find the actual `drawphone.web.1` container. Verify image ID/source label, Node `v22.23.4`, npm `10.9.9` (use `/app/.heroku/node/bin` PATH), logs, public HTTP/assets, a disposable game creation, and a WebSocket handshake. Brotli `1.1.0` is the expected patched backport string. Verify other apps' existing containers remain healthy without creating games on them. Existing in-memory games disconnect on the one-app restart. Never report deployment success based solely on image build/import.

If deployment fails, the script attempts restoration using the protected image. If post-deploy health fails, explicitly restore with `dokku git:from-image drawphone dokku/drawphone:rollback-TIMESTAMP`, then verify actual service health. **The old image restores Node 16 and the vulnerability.** Stop escalation and report. The source bundle is for history recovery, not a reason to force-push or run an unplanned source build. Retain rollback and backup until separately authorized to remove them.
