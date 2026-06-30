"""GET /api/weather — Clima local vía Open-Meteo con caché.

Llama a open-meteo.com desde el backend para no exponer IPs y
cachea la respuesta 5 minutos para reducir llamadas externas.
"""
import time
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends

from auth import verify_token

router = APIRouter(tags=["weather"])

# Coordenadas Puerto Montt, Chile
LAT = -41.47
LON = -72.94
CACHE_TTL = 300  # 5 minutos

_cache: dict = {"data": None, "ts": 0}


@router.get("/api/weather")
async def get_weather(_token: str = Depends(verify_token)):
    now = time.time()

    # Sirve de caché si es reciente
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": (
            "temperature_2m,relative_humidity_2m,apparent_temperature,"
            "weather_code,wind_speed_10m,precipitation,pressure_msl,"
            "visibility,uv_index"
        ),
        "timezone": "America/Santiago",
    }

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            data["_cached_at"] = datetime.utcnow().isoformat()
            _cache["data"] = data
            _cache["ts"] = now
            return data
    except httpx.TimeoutException:
        if _cache["data"]:
            _cache["data"]["_stale"] = True
            return _cache["data"]
        return {"error": "timeout", "message": "Weather API no respondió"}
    except Exception as e:
        if _cache["data"]:
            _cache["data"]["_stale"] = True
            return _cache["data"]
        return {"error": str(e)[:80], "current": None}
