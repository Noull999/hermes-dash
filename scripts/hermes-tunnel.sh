#!/usr/bin/env bash
#
# hermes-tunnel.sh — Levanta un túnel rápido de Cloudflare (trycloudflare)
# hacia el backend local y, cada vez que la URL cambia, actualiza las
# variables de entorno en Vercel (BACKEND_URL + NEXT_PUBLIC_WS_URL) y
# dispara un redeploy. Así el dashboard sobrevive a cada reinicio del túnel
# sin tocar nada a mano.
#
# Requisitos en el VPS: cloudflared, curl, jq, coreutils (stdbuf).
# Secretos: se leen de /root/hermes-dash/scripts/tunnel.env (gitignored).
#
set -uo pipefail

# ── Secretos (rellenar en tunnel.env) ───────────────────────────────────
VERCEL_TOKEN="${VERCEL_TOKEN:-}"   # https://vercel.com/account/tokens
DEPLOY_HOOK="${DEPLOY_HOOK:-}"     # Vercel → proyecto → Settings → Git → Deploy Hooks

# ── Fijos del proyecto hermes-dash ──────────────────────────────────────
PROJECT_ID="prj_f9eztkDx4Gp4tcGj8SFWAhQksBZf"
TEAM_ID="team_eRMMe1q2t0K1gM0ay05bp5Ih"
LOCAL_PORT="${LOCAL_PORT:-8080}"

API="https://api.vercel.com"
STATE_FILE="/run/hermes-tunnel.url"   # guarda la última URL aplicada

log() { echo "[hermes-tunnel] $*"; }

if [[ -z "$VERCEL_TOKEN" || -z "$DEPLOY_HOOK" ]]; then
  log "ERROR: define VERCEL_TOKEN y DEPLOY_HOOK en tunnel.env"
  exit 1
fi

# Borra la var (si existe) y la vuelve a crear con el valor nuevo.
update_env() {
  local key="$1" val="$2" id
  id=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "$API/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
        | jq -r ".envs[] | select(.key==\"$key\") | .id" | head -1)
  if [[ -n "$id" && "$id" != "null" ]]; then
    curl -s -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
      "$API/v9/projects/$PROJECT_ID/env/$id?teamId=$TEAM_ID" >/dev/null
  fi
  curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    "$API/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
    -d "{\"key\":\"$key\",\"value\":\"$val\",\"type\":\"plain\",\"target\":[\"production\"]}" \
    >/dev/null
}

on_url() {
  local url="$1"
  # Evita redeploys duplicados si la URL no cambió.
  if [[ -f "$STATE_FILE" && "$(cat "$STATE_FILE" 2>/dev/null)" == "$url" ]]; then
    return
  fi
  local wss="wss://${url#https://}/api/chat"
  log "Nueva URL del túnel: $url"
  update_env BACKEND_URL "$url"
  update_env NEXT_PUBLIC_WS_URL "$wss"
  log "Variables actualizadas en Vercel. Disparando redeploy…"
  curl -s -X POST "$DEPLOY_HOOK" >/dev/null
  echo "$url" > "$STATE_FILE"
  # Útil también para el propio backend / chat_ws local.
  log "Redeploy disparado. WSS = $wss"
}

log "Iniciando cloudflared hacia http://localhost:$LOCAL_PORT …"
# stdbuf -oL fuerza salida línea-a-línea para capturar la URL al instante.
stdbuf -oL cloudflared tunnel --url "http://localhost:$LOCAL_PORT" 2>&1 |
while IFS= read -r line; do
  echo "$line"
  if [[ "$line" =~ (https://[a-z0-9-]+\.trycloudflare\.com) ]]; then
    on_url "${BASH_REMATCH[1]}"
  fi
done
