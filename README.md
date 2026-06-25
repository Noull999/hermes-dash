# Hermes Dashboard

Centro de control personal con IA — Orb 3D, chat, repos, Claude Code, tokens y más.

## Arquitectura

```
Frontend (Vercel) → Cloudflare Tunnel → Backend FastAPI (VPS) → Hermes Gateway
```

## Fases

| Fase | Estado | Contenido |
|------|--------|-----------|
| 0 | ✅ | Backend + Frontend base, tokens, sistema |
| 1 | ✅ | Chat WebSocket, Orb 3D, Repo Center, Timeline |
| 2 | ✅ | Claude Code launcher, Segundo cerebro, Recordatorios, Gamificación |
| 3 | ⏳ | Correos inteligentes, Calendario, Job Center, Push |
| 4 | ⏳ | Escritorio arrastrable, Modo enfoque, Settings |

## Backend (VPS)

```bash
cd ~/hermes-dash/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

## Frontend (local)

```bash
cd frontend
npm install
npm run dev
```

## Enlaces

- **Dashboard:** https://hermes-dash.vercel.app
- **Repositorio:** https://github.com/Noull999/hermes-dash
