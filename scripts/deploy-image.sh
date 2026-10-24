#!/usr/bin/env bash
# Run only with the coordinator's exclusive production slot. No app compilation.
set -euo pipefail
artifacts=$(realpath "${1:?Usage: scripts/deploy-image.sh ARTIFACT_DIRECTORY [root@host]}")
host=${2:-root@134.209.222.77}
ssh_options=(-o BatchMode=yes -o StrictHostKeyChecking=yes)
(cd "$artifacts" && sha256sum -c image.tar.sha256)
image=$(<"$artifacts/image.tag")
expected=$(<"$artifacts/image.id")
revision=$(<"$artifacts/source.commit")
[[ $image =~ ^localhost/drawphone:[a-f0-9]{40}-[0-9]{8}T[0-9]{6}Z$ ]]
[[ $expected =~ ^sha256:[a-f0-9]{64}$ && $revision =~ ^[a-f0-9]{40}$ ]]
archive_sha=$(sha256sum "$artifacts/image.tar" | cut -d ' ' -f 1)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
remote="/var/tmp/drawphone-image-${revision}-${stamp}.tar"
job="/root/drawphone-deploy-${stamp}"
# Allow uncompressed archive + a second copy of layers + 2 GiB reserve, >=6 GiB.
archive_bytes=$(stat -c %s "$artifacts/image.tar")
required=$((archive_bytes * 2 + 2147483648))
(( required >= 6442450944 )) || required=6442450944
ssh "${ssh_options[@]}" "$host" "test \"\$(df -B1 --output=avail /var/lib/docker | tail -1)\" -gt $required && test \"\$(awk '/MemAvailable:/ {print \$2}' /proc/meminfo)\" -gt 409600"
scp "${ssh_options[@]}" "$artifacts/image.tar" "$host:$remote"
# The long operation survives SSH/harness disconnects under a transient systemd unit.
# Its private log and atomic exit marker allow reconciliation without redeploying.
printf 'Remote deployment job: %s (reconcile this path after any disconnect)\n' "$job"
ssh "${ssh_options[@]}" "$host" bash -s -- "$job" "$stamp" "$remote" "$archive_sha" "$image" "$expected" "$revision" <<'LAUNCH'
set -euo pipefail
job=$1; stamp=$2; shift 2
install -d -m 700 "$job"
cat > "$job/run.sh" <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail
job=$1; archive=$2; checksum=$3; image=$4; expected=$5; revision=$6
exec >"$job/output.log" 2>&1
trap 'r=$?; printf "%s\n" "$r" > "$job/exit.tmp"; mv "$job/exit.tmp" "$job/exit"' EXIT
printf '%s  %s\n' "$checksum" "$archive" | sha256sum -c -
# Record effective routing before import; EXPOSE must not infer new public ports.
dokku ports:report drawphone > "$job/ports-before.txt"
dokku proxy:report drawphone > "$job/proxy-before.txt"
mapping=$(dokku ports:report drawphone --ports-map)
[[ -n $mapping ]] || mapping=$(dokku ports:report drawphone --ports-map-detected)
read -r -a ports <<< "$mapping"
[[ ${#ports[@]} -gt 0 ]]
for port in "${ports[@]}"; do [[ $port =~ ^(http|https|tcp|udp):[0-9]+:[0-9]+$ ]]; done
printf '%s\n' "$mapping" > "$job/effective-ports.txt"
# Fail rather than claim a successful empty source backup.
git --git-dir=/home/dokku/drawphone show-ref --verify refs/heads/prod > "$job/source-ref"
git --git-dir=/home/dokku/drawphone bundle create "$job/source.bundle" --all
git --git-dir=/home/dokku/drawphone bundle verify "$job/source.bundle"
old=$(docker inspect --format '{{.Image}}' drawphone.web.1)
rollback="dokku/drawphone:rollback-$(date -u +%Y%m%dT%H%M%SZ)"
docker tag "$old" "$rollback"
test "$(docker image inspect --format '{{.Id}}' "$rollback")" = "$old"
printf '%s\n' "$old" > "$job/old-image.id"
printf '%s\n' "$rollback" > "$job/rollback.tag"
printf '%s\n' "$revision" > "$job/new-source.commit"
test "$(df -B1 --output=avail /var/lib/docker | tail -1)" -gt "$(($(stat -c %s "$archive") + 2147483648))"
docker load -i "$archive"
test "$(df -B1 --output=avail /var/lib/docker | tail -1)" -gt 2147483648
test "$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)" -gt 409600
test "$(docker image inspect --format '{{.Id}}' "$image")" = "$expected"
test "$(docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$image")" = "$revision"
# Preserve THIS app's original public/target mappings before image inference.
dokku ports:set drawphone "${ports[@]}"
if ! dokku git:from-image drawphone "$image"; then
    echo "Deploy failed; restoring $rollback (restores vulnerable Node)." >&2
    dokku git:from-image drawphone "$rollback"
    exit 1
fi
if [[ $(dokku ports:report drawphone --ports-map) != "$mapping" ]]; then
    echo 'Port mapping changed unexpectedly; restoring routing and old image.' >&2
    dokku ports:set drawphone "${ports[@]}"
    dokku git:from-image drawphone "$rollback"
    exit 1
fi
printf 'New image: %s\nRollback reference: %s\nSource backup/job: %s\n' "$expected" "$rollback" "$job"
rm -- "$archive"
REMOTE
chmod 700 "$job/run.sh"
systemd-run --quiet --unit="drawphone-deploy-$stamp" /bin/bash "$job/run.sh" "$job" "$@"
LAUNCH
# A polling timeout is NOT a deploy failure: never launch a speculative retry.
for ((i=0; i<120; i++)); do
    status=$(ssh "${ssh_options[@]}" "$host" "if test -f '$job/exit'; then cat '$job/exit'; else echo running; fi")
    if [[ $status != running ]]; then
        ssh "${ssh_options[@]}" "$host" "tail -80 '$job/output.log'"
        [[ $status == 0 ]]
        exit
    fi
    sleep 5
done
echo "Still running or needs reconciliation: $job; inspect its exit/log and container state, DO NOT retry." >&2
exit 2
# Successful job completion still REQUIRES actual-container/public health checks.
