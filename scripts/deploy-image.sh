#!/usr/bin/env bash
# Run only with the coordinator's exclusive production slot. No app compilation.
set -euo pipefail
artifacts=$(realpath "${1:?Usage: scripts/deploy-image.sh ARTIFACT_DIRECTORY [root@host]}")
host=${2:-root@134.209.222.77}
(cd "$artifacts" && sha256sum -c image.tar.sha256)
image=$(<"$artifacts/image.tag")
expected=$(<"$artifacts/image.id")
revision=$(<"$artifacts/source.commit")
[[ $image =~ ^localhost/drawphone:[a-f0-9]{40}-[0-9]{8}T[0-9]{6}Z$ ]]
[[ $expected =~ ^sha256:[a-f0-9]{64}$ && $revision =~ ^[a-f0-9]{40}$ ]]
archive_sha=$(sha256sum "$artifacts/image.tar" | cut -d ' ' -f 1)
remote="/var/tmp/drawphone-image-${revision}-$(date -u +%Y%m%dT%H%M%SZ).tar"
# Headroom for archive, loaded layers and a brief overlapping web container.
ssh "$host" 'test "$(df -B1 --output=avail /var/lib/docker | tail -1)" -gt 6442450944 && test "$(awk '\''/MemAvailable:/ {print $2}'\'' /proc/meminfo)" -gt 409600'
scp "$artifacts/image.tar" "$host:$remote"
ssh "$host" bash -s -- "$remote" "$archive_sha" "$image" "$expected" "$revision" <<'REMOTE'
set -euo pipefail
archive=$1; checksum=$2; image=$3; expected=$4; revision=$5
printf '%s  %s\n' "$checksum" "$archive" | sha256sum -c -
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="/root/drawphone-preimage-$stamp"
install -d -m 700 "$backup"
# Fail rather than claim a successful empty source backup.
git --git-dir=/home/dokku/drawphone show-ref --verify refs/heads/prod > "$backup/source-ref"
git --git-dir=/home/dokku/drawphone bundle create "$backup/source.bundle" --all
git --git-dir=/home/dokku/drawphone bundle verify "$backup/source.bundle"
old=$(docker inspect --format '{{.Image}}' drawphone.web.1)
rollback="dokku/drawphone:rollback-$stamp"
docker tag "$old" "$rollback"
test "$(docker image inspect --format '{{.Id}}' "$rollback")" = "$old"
printf '%s\n' "$old" > "$backup/old-image.id"
printf '%s\n' "$rollback" > "$backup/rollback.tag"
printf '%s\n' "$revision" > "$backup/new-source.commit"
docker load -i "$archive"
test "$(docker image inspect --format '{{.Id}}' "$image")" = "$expected"
test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")" = "$revision"
# Documented Dokku 0.36.3 path: replaces app deploy ref with a FROM-only Dockerfile.
# Runtime configuration stays in Dokku. No npm/webpack or remote source build occurs.
if ! dokku git:from-image drawphone "$image"; then
    echo "Deploy failed; restoring preserved image $rollback (restores old vulnerable Node)." >&2
    dokku git:from-image drawphone "$rollback"
    exit 1
fi
printf 'New image: %s\nRollback reference: %s\nSource backup: %s\n' "$expected" "$rollback" "$backup"
# Remove only this successfully consumed transfer archive; never prune images.
rm -- "$archive"
REMOTE
# Health/runtime verification is mandatory immediately after this command.
