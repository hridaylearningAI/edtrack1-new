#!/usr/bin/env bash
# Push .env.local variables to Vercel (production, preview, development).
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

SKIP_KEYS=(
  DATABASE_URL
  SUPABASE_DB_PASSWORD
  DEMO_PASSWORD
  CATALOG_URL
  SERVICE_ROLE
  user_moodle
  pass_moodle
)

should_skip() {
  local key="$1"
  for skip in "${SKIP_KEYS[@]}"; do
    [[ "$key" == "$skip" ]] && return 0
  done
  return 1
}

is_sensitive() {
  local key="$1"
  # NEXT_PUBLIC_* values are embedded in the client bundle — not Vercel "sensitive" secrets
  [[ "$key" == NEXT_PUBLIC_* ]] && return 1
  [[ "$key" == *SECRET* || "$key" == *PASSWORD* || "$key" == *TOKEN* ]] && return 0
  [[ "$key" == *_KEY || "$key" == *KEY ]] && return 0
  return 1
}

parse_env_value() {
  local raw="$1"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  if [[ "$raw" == \"*\" && "$raw" == *\" ]]; then
    raw="${raw:1:${#raw}-2}"
  elif [[ "$raw" == \'*\' && "$raw" == *\' ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  printf '%s' "$raw"
}

add_env() {
  local key="$1"
  local value="$2"
  local target

  for target in production preview development; do
    if is_sensitive "$key"; then
      if printf '%s' "$value" | vercel env add "$key" "$target" --sensitive --force >/dev/null 2>&1; then
        echo "  + $key ($target)"
      else
        echo "  ! failed: $key ($target)" >&2
      fi
    else
      if printf '%s' "$value" | vercel env add "$key" "$target" --force >/dev/null 2>&1; then
        echo "  + $key ($target)"
      else
        echo "  ! failed: $key ($target)" >&2
      fi
    fi
  done
}

added=0
skipped=0
failed=0

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%%#*}"
  line="${line%"${line##*[![:space:]]}"}"
  [[ -z "$line" ]] && continue
  [[ "$line" != *=* ]] && continue

  key="${line%%=*}"
  key="${key%"${key##*[![:space:]]}"}"
  value="$(parse_env_value "${line#*=}")"
  [[ -z "$key" || -z "$value" ]] && continue

  if should_skip "$key"; then
    skipped=$((skipped + 1))
    continue
  fi

  add_env "$key" "$value"
  added=$((added + 1))
done < "$ENV_FILE"

if ! vercel env ls 2>/dev/null | grep -q 'NEXT_PUBLIC_APP_URL'; then
  add_env "NEXT_PUBLIC_APP_URL" "https://edtrack1-new.vercel.app"
  added=$((added + 1))
fi

if ! vercel env ls 2>/dev/null | grep -q 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'; then
  if [[ -f .env ]] && grep -q '^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=' .env; then
    val="$(grep '^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=' .env | cut -d= -f2- | tr -d '"')"
    add_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "$val"
    added=$((added + 1))
  fi
fi

echo ""
echo "Done. Processed $added variables (skipped $skipped local-only)."
echo "Verify critical keys:"
vercel env ls 2>/dev/null | grep -E 'CLERK|SUPABASE' || true
