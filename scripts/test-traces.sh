#!/usr/bin/env bash
# Checks the trace endpoint in the real image: every POST is kept as one JSON
# line, and the file stays around 1 MB by dropping its oldest lines.
#
#   scripts/test-traces.sh        (needs Docker; builds the image)
set -euo pipefail
cd "$(dirname "$0")/.."

IMAGE=spielzeugkiste:test-traces
NAME=spielzeugkiste-test-traces
PORT=18091
FILE=/var/log/traces/traces.jsonl
LIMIT=$((1024 * 1024))

docker build -q -t "$IMAGE" . >/dev/null
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --rm --name "$NAME" -p "$PORT:80" "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
for _ in $(seq 50); do curl -sf "localhost:$PORT/" >/dev/null && break; sleep 0.2; done

fail() { echo "FAIL: $*"; exit 1; }

# About 10 KB per try, like a real one
pad=$(head -c 10000 /dev/zero | tr '\0' 'x')
for i in $(seq 1 300); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: text/plain' \
    --data "{\"try\":$i,\"pad\":\"$pad\"}" "localhost:$PORT/api/traces")
  [ "$code" = 204 ] || fail "POST $i answered $code"
done

[ "$(curl -s -o /dev/null -w '%{http_code}' "localhost:$PORT/api/traces")" != 204 ] || fail "GET must not be accepted"

docker exec "$NAME" cat "$FILE" > /tmp/test-traces.jsonl
size=$(wc -c < /tmp/test-traces.jsonl)
[ "$size" -le $((LIMIT + 20000)) ] || fail "file is $size bytes, more than about 1 MB"
python3 - /tmp/test-traces.jsonl <<'PY' || fail "file has broken lines"
import json, sys
tries = [json.loads(l)['try'] for l in open(sys.argv[1])]
assert tries[-1] == 300, f'newest try missing: {tries[-1]}'
assert tries == sorted(tries), 'lines out of order'
assert tries[0] > 1, 'oldest tries were not dropped'
print(f'{len(tries)} tries kept ({tries[0]}..{tries[-1]})')
PY
echo "PASS: $size bytes"
