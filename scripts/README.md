# Túnel Cloudflare auto-actualizable

Mantiene el dashboard funcionando aunque el túnel `trycloudflare` cambie de URL
en cada reinicio. Cuando el túnel arranca, el script captura la nueva URL,
actualiza `BACKEND_URL` y `NEXT_PUBLIC_WS_URL` en Vercel y dispara un redeploy.

## Instalación en el VPS (una sola vez)

```bash
cd /root/hermes-dash && git pull

# 1. Dependencias
apt-get install -y jq cloudflared   # cloudflared ya suele estar

# 2. Secretos
cp scripts/tunnel.env.example scripts/tunnel.env
nano scripts/tunnel.env             # pega VERCEL_TOKEN y DEPLOY_HOOK

#    - VERCEL_TOKEN: https://vercel.com/account/tokens
#    - DEPLOY_HOOK:  Vercel → hermes-dash → Settings → Git → Deploy Hooks
#                    (crea uno apuntando a la branch main, copia la URL)

# 3. Permisos
chmod +x scripts/hermes-tunnel.sh

# 4. Instalar el servicio
cp scripts/cloudflared-hermes.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cloudflared-hermes

# 5. Ver que capturó la URL y actualizó Vercel
journalctl -u cloudflared-hermes -f
```

## Importante

- Si ya tienes **otro** servicio de cloudflared corriendo el túnel, deshabilítalo
  primero (`systemctl disable --now cloudflared`) — este servicio levanta su
  propio túnel. Tener dos túneles al puerto 8080 es redundante.
- Cada reinicio del túnel implica un redeploy de Vercel (~30 s). Durante ese
  lapso el chat se reconecta solo cuando el deploy termina.
- Para algo **sin caídas y sin redeploys**, lo ideal es un *named tunnel* con
  dominio fijo (o Tailscale Funnel) — ahí la URL nunca cambia y no necesitas
  este script.
