#!/usr/bin/env bash
# Build committed Drawphone source off-host; never reads production configuration.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git diff --quiet && git diff --cached --quiet || { echo 'Commit reviewed changes before building.' >&2; exit 1; }
revision=$(git rev-parse HEAD)
out=$(realpath -m "${1:-$HOME/.cache/drawphone-cve-build/release-$revision}")
mkdir -p "$out"
[[ $(findmnt -n -o FSTYPE -T "$out") != tmpfs ]] || { echo 'Use disk-backed artifact storage, not tmpfs.' >&2; exit 1; }
[[ ! -e "$out/image.tar" ]] || { echo 'Refusing to overwrite an existing release archive.' >&2; exit 1; }
exec 9>/tmp/dokku-cve-offhost-build.lock
flock 9
[[ $(awk '/MemAvailable:/ {print $2}' /proc/meminfo) -gt 4194304 ]] || { echo 'Need at least 4 GiB available local memory.' >&2; exit 1; }
base=docker.io/gliderlabs/herokuish@sha256:475ba6ea9eaa02934eb694d842c61adcdd49a564f4003aa45dc6a81b276a7b74
stamp=$(date -u +%Y%m%dT%H%M%SZ)
image="localhost/drawphone:${revision}-${stamp}"
name="drawphone-build-${revision:0:12}-${stamp}"
work=$(mktemp -d "$out/source.XXXXXX")
cleanup() {
    # Keep the lock until an interrupted owned build container is stopped.
    if [[ $(podman inspect --format '{{.State.Running}}' "$name" 2>/dev/null || true) == true ]]; then
        podman stop -t 10 "$name" >/dev/null
    fi
    rm -rf "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
git archive HEAD | tar -x -C "$work"
podman pull "$base"
podman create --name "$name" --memory=3g --cpus=2 --entrypoint /bin/bash "$base" -lc '/build && test ! -s /app/.profile.d/00_config_vars.sh && rm -f /app/.profile.d/00_config_vars.sh'
podman cp "$work/." "$name:/app"
podman start -a "$name"
[[ $(podman inspect --format '{{.State.ExitCode}}' "$name") == 0 ]]
podman commit --format docker \
    --change 'ENTRYPOINT ["/start"]' --change 'CMD ["web"]' \
    --change 'EXPOSE 5000' \
    --change "LABEL org.opencontainers.image.revision=$revision" \
    "$name" "$image"
id=$(podman image inspect --format '{{.Id}}' "$image")
printf 'sha256:%s\n' "${id#sha256:}" > "$out/image.id"
printf '%s\n' "$image" > "$out/image.tag"
printf '%s\n' "$revision" > "$out/source.commit"
podman save --format docker-archive -o "$out/image.tar" "$image"
(cd "$out" && sha256sum image.tar > image.tar.sha256)
printf 'Built %s\nArtifacts: %s\n' "$image" "$out"
# Keep the named local build container/image for inspection; no broad cleanup/pruning.
