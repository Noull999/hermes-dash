# Hermès Dashboard — Roadmap 2026
> Plan de implementación detallado. Seguir en orden: cada fase depende de la anterior.

---

## FASE 0 — JARVIS GLOW-UP (estética / motion)
> **Objetivo:** que la interfaz deje de sentirse estática y pase a sentirse "viva" tipo JARVIS.
> Todo aditivo, sin dependencias nuevas (usa CSS + three.js que ya está instalado).
> Paleta objetivo: **JARVIS puro** — cyan `--cyan` dominante + amber `--amber` como único acento.
>
> **Estado:** ✅ items 0.1–0.4 los implementa Claude directo. Items 0.5–0.8 los implementa Hermès.

Stack ya disponible: Tailwind v4, three.js + @react-three/fiber, zustand, lucide-react. **No instalar Framer Motion** salvo que un item lo pida — casi todo se hace con `@keyframes` + `clip-path` + `conic-gradient`, coherente con lo que ya existe en `globals.css`.

### 0.1 — Fondo aurora animado (el fix #1 del "se ve básico")
El `--void` plano es el 60% de por qué se ve genérico. Agregar una capa de aurora/nebulosa que deriva lento detrás de todo.
- **`globals.css`**: nueva capa `.hud-aurora` (fixed, `z-index: -2`, `pointer-events:none`) con 2-3 blobs radiales cyan/amber muy tenues (`opacity 0.06–0.10`) que se mueven con `@keyframes auroraDrift` (60–90s, `translate` + `scale` suave). `filter: blur(60px)`. Respetar `prefers-reduced-motion`.
- **`layout.tsx`**: montar `<div className="hud-aurora" aria-hidden />` junto a las otras capas hud.
- Clave: sutil. No debe competir con el orb ni reducir legibilidad del texto.

### 0.2 — Border-beam en superficies clave
Borde con un haz de luz que recorre el perímetro. Marca JARVIS instantánea.
- **`globals.css`**: `@keyframes beamRotate` + clase `.border-beam` que usa `conic-gradient` enmascarado en el borde (técnica: pseudo-elemento con `padding: 1px`, `mask` con `linear-gradient` en composición `xor`).
- **Componente** `frontend/src/components/ui/BorderBeam.tsx` (opcional, reutilizable) o solo la clase.
- Aplicar a: `InputBox` (el input principal), `VoiceButton` cuando `listening`, y las `BentoCard` de la Fase 2.

### 0.3 — Boot sequence (splash de arranque)
Al cargar la app, overlay de ~1.5s tipo terminal JARVIS que "inicializa el sistema".
- **Componente** `frontend/src/components/ui/BootSequence.tsx`: overlay `fixed inset-0 z-[100]` con fondo `--void`.
- Secuencia de líneas mono que aparecen escalonadas: `> INIT SYS.HERMES`, `> LINK GATEWAY :8642 ... OK`, `> LOAD MODULES ... OK`, `> HUD ONLINE`. Barra de progreso cyan.
- Al terminar, `fade-out` + `clip-path` reveal de la app. Guardar flag en `sessionStorage` para no repetir en cada navegación (solo primera carga de sesión).
- Montar en `layout.tsx` o en `page.tsx`.

### 0.4 — Bottom nav estilo Dock (magnify + glow)
El nav actual es plano. Convertirlo en dock: el ícono bajo el cursor/tap crece y brilla, los vecinos crecen menos (efecto lupa macOS).
- Modificar el `<nav>` en `page.tsx` (y `BottomNav.tsx` si aplica).
- En desktop: magnify por proximidad de cursor (calcular distancia al centro de cada ícono → escala). En mobile: press-scale + glow en el activo.
- Indicador activo: la línea superior cyan ya existe — agregarle `box-shadow` glow animado.

### 0.5 — Texto que se revela/desencripta (respuestas de Hermès) [HERMÈS]
Las respuestas aparecen de golpe. Hacer que se "escriban" o "desencripten".
- **Componente** `frontend/src/components/chat/DecryptText.tsx`: recibe el texto final y anima carácter por carácter (efecto "scramble" → cada char pasa por símbolos random antes de fijarse, ~20ms/char, tope de duración ~1.2s para mensajes largos).
- Integrar en `Message.tsx` SOLO para `role === 'assistant'` y solo en el mensaje más reciente (no re-animar historial). Cuidado: `renderContent` usa markdown + `dangerouslySetInnerHTML`; animar el texto plano ANTES de pasarlo por el parser, o animar solo mensajes sin bloques de código.
- Alternativa más simple y segura: reveal por `clip-path` línea por línea (menos "hacker" pero cero riesgo con el markdown).

### 0.6 — Orb audio-reactive (pulsa con tu voz) [HERMÈS]
Cuando usas el micrófono, el orb debe reaccionar al volumen de tu voz en tiempo real.
- En `VoiceButton.tsx`, además de `SpeechRecognition`, abrir `getUserMedia` → `AudioContext` → `AnalyserNode` para leer el volumen (RMS) en cada frame.
- Publicar el nivel en un store zustand (`useHermesStore` → `micLevel: number 0..1`).
- En `OrbCanvas.tsx` (`Orb3DCanvas`), leer `micLevel` y modular: escala de partículas, brillo del glow central y `ringSpeed`. Sin voz = idle normal.
- Respetar permisos: solo abrir el AudioContext cuando el mic ya está activo.

### 0.7 — Number ticker en métricas [HERMÈS]
Los números del dashboard (CPU, RAM, tokens) deben "subir" animados, no aparecer fijos.
- **Componente** `frontend/src/components/ui/NumberTicker.tsx`: recibe `value`, anima desde el valor previo con `requestAnimationFrame` + easing (~600ms), `tabular-nums`.
- Usar en todos los widgets de la Fase 2 y en cualquier readout numérico.

### 0.8 — Sonidos UI sutiles (opcional, tipo interfaz sci-fi) [HERMÈS]
Feedback sonoro discreto: beep corto al enviar, "whoosh" al abrir paneles, click al navegar.
- **Hook** `frontend/src/lib/useUiSound.ts` usando `AudioContext` (oscillators sintetizados, sin archivos) o 3-4 samples cortos en `/public/sounds/`.
- Toggle global en `/settings` (`localStorage: hermes_sound_enabled`, default OFF para no molestar).
- Enganchar en: enviar mensaje, abrir command palette (Fase 1), cambio de estado del orb.

### Orden de ejecución Fase 0
```
0.1 Aurora background   — 30min — CLAUDE — máximo impacto/esfuerzo
0.2 Border-beam         — 45min — CLAUDE
0.3 Boot sequence       — 45min — CLAUDE
0.4 Dock nav            — 1h    — CLAUDE
0.5 Text decrypt        — 1-2h  — HERMÈS
0.6 Orb audio-reactive  — 2h    — HERMÈS
0.7 Number ticker       — 30min — HERMÈS
0.8 Sonidos UI          — 1-2h  — HERMÈS (opcional)
```

### Checkpoint de review Fase 0
- [ ] 0.1: fondo tiene movimiento sutil sin afectar legibilidad ni FPS en mobile
- [ ] 0.2: haz de luz recorre bordes de input/cards, coherente con el cyan
- [ ] 0.3: al cargar aparece la secuencia de boot, no se repite al navegar
- [ ] 0.4: íconos del nav reaccionan (magnify/press + glow en activo)
- [ ] 0.5: respuestas de Hermès se revelan animadas sin romper markdown/código
- [ ] 0.6: orb pulsa con la voz al hablar
- [ ] 0.7: métricas suben animadas
- [ ] 0.8: sonidos opcionales, off por defecto

---

## FASE 1 — Command Palette (sin backend)

### 1.1 Crear `frontend/src/components/ui/CommandPalette.tsx`

Componente modal que se abre con `Cmd+K` (desktop) y un botón flotante en mobile.

**Estructura:**
```
CommandPalette
├── overlay (fondo oscuro semitransparente)
├── panel (glass card, max-w-lg, centrado)
│   ├── input de búsqueda (autofocus al abrir)
│   ├── lista de resultados filtrados
│   └── footer con hint de teclas
```

**Acciones que debe tener (hardcoded inicialmente):**
```ts
type Command = {
  id: string;
  label: string;       // texto visible
  keywords: string[];  // para filtrar
  icon: LucideIcon;
  action: () => void;
};
```

Lista de comandos:
- "Nueva sesión" → `useChatStore.getState().clearMessages()`
- "Ir a Dashboard" → `router.push('/dashboard')`
- "Ir a Email" → `router.push('/email')`
- "Ir a Calendario" → `router.push('/calendar')`
- "Ir a Repositorios" → `router.push('/repos')`
- "Ir a Brain" → `router.push('/brain')`
- "Ir a Jobs" → `router.push('/jobs')`
- "Ir a Configuración" → `router.push('/settings')`
- "Reconectar WebSocket" → `useChatStore.getState().connect()`
- "Buscar en conversaciones" → abrir search panel (Fase 4)
- "Modo TAP / AUTO" → toggle voice mode en localStorage

**Comportamiento:**
- `useEffect` global para escuchar `Cmd+K` / `Ctrl+K`
- Filtrado en tiempo real mientras escribe (case-insensitive, incluye keywords)
- Navegar con flechas ↑↓, Enter ejecuta, Escape cierra
- Resaltar letras que coinciden con el query (bold o color cyan)
- Al ejecutar: cerrar palette + ejecutar acción

**Estilos (coherentes con el resto):**
- Overlay: `bg-black/60 backdrop-blur-sm`
- Panel: `bg-[var(--card)] border border-[var(--hairline)] rounded-2xl shadow-2xl`
- Input: sin borde visible, texto blanco, placeholder gris
- Item hover: `bg-[rgba(0,212,255,0.06)]`
- Item activo (teclado): `bg-[rgba(0,212,255,0.12)] text-[var(--cyan)]`

### 1.2 Modificar `frontend/src/app/layout.tsx`

Envolver la app con `<CommandPaletteProvider>` o simplemente montar `<CommandPalette>` aquí una sola vez (singleton global).

### 1.3 Agregar botón en top bar (`frontend/src/app/page.tsx`)

En el top bar, a la izquierda del VoiceButton, agregar:
```tsx
<button
  onClick={() => openPalette()}
  className="hud-label text-[9px] px-2 py-1 border border-[var(--hairline)] rounded text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-all hidden sm:flex items-center gap-1.5"
>
  <Search size={10} />
  CMD+K
</button>
```

En mobile, agregar un botón de búsqueda flotante (arriba del input) o integrar en el top bar como ícono solo.

---

## FASE 2 — Bento Grid Dashboard

### 2.1 Rediseñar `frontend/src/app/dashboard/page.tsx`

Reemplazar el layout actual (lista vertical) por un **CSS Grid responsive tipo bento**:

```
Mobile (1 col):   [widget full-width] apilados
Tablet (2 col):   [pequeño][pequeño] / [grande full]  
Desktop (3-4 col): grid libre con `grid-column: span N`
```

**Widgets a implementar (en orden de tamaño/prioridad):**

#### Widget: SystemStatus (2×1)
Muestra CPU, RAM, Disk en tiempo real. Ya existe la API `/api/system`.
- 3 barras horizontales con animación
- Color: verde si < 70%, amarillo 70-90%, rojo > 90%
- Refetch cada 10s

#### Widget: NextEvent (1×1)
Próximo evento del calendario. API: `/api/calendar?days=1`
- Título del evento
- Tiempo restante ("en 2h 15min")
- Si no hay eventos: "Sin eventos hoy"

#### Widget: TokenBudget (1×1)
Tokens usados/restantes de Hermès. API: `/api/tokens`
- Barra de progreso circular (SVG simple)
- % usado, tokens restantes
- Reset en: tiempo hasta next_reset

#### Widget: ActiveJobs (2×1)
Jobs corriendo ahora. API: `/api/jobs`
- Lista de jobs con `running: true`
- Si ninguno: "Sin tareas activas"
- Estado de cada cron (última ejecución)

#### Widget: RecentRepos (2×1)
Últimos repos tocados con su estado. API: `/api/repos`
- 3-4 repos ordenados por `updated_at`
- Badge de estado (synced / behind / ahead)
- Botón pull inline

#### Widget: QuickChat (4×1 o full-width)
Mini input para mandar mensaje a Hermès sin ir a home.
- Textarea pequeño + botón enviar
- `sendMessage()` del useChatStore
- Redirige a `/` después de enviar

**Clases CSS para el grid:**
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px;
}
/* responsive: 2 cols en tablet, 1 en mobile */
```

Cada widget: componente `BentoCard` con props `colSpan` y `rowSpan`:
```tsx
<BentoCard colSpan={2} className="...">
  <SystemStatus />
</BentoCard>
```

### 2.2 Crear `frontend/src/components/dashboard/BentoCard.tsx`

```tsx
interface BentoCardProps {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2;
  title?: string;
  children: React.ReactNode;
  className?: string;
}
```
- Base: `glass rounded-2xl p-4 border border-[var(--hairline)]`
- Header opcional con título en `hud-label` style
- Hover: sutil border glow cyan

---

## FASE 3 — Drag & Drop de Archivos al Chat

### 3.1 Backend: `backend/routes/upload.py` (nuevo archivo)

Endpoint `POST /api/upload`:
- Acepta `multipart/form-data` con campo `file`
- Tipos permitidos: PDF, PNG, JPG, JPEG, WEBP, TXT, MD, PY, JS, TS, JSON (max 10MB)
- Para **imágenes**: convertir a base64, devolver `{ type: "image", base64: "...", mime: "image/png" }`
- Para **texto/código**: leer contenido, devolver `{ type: "text", content: "..." }`
- Para **PDF**: extraer texto con `PyPDF2` o `pdfplumber` (instalar si no está), devolver `{ type: "text", content: "..." }`
- Guardar temporalmente en `/tmp/hermes_uploads/` (limpiar archivos > 1h con un simple check)

Registrar en `backend/main.py`:
```python
from routes.upload import router as upload_router
app.include_router(upload_router, prefix="/api")
```

### 3.2 Frontend: modificar `frontend/src/components/chat/InputBox.tsx`

Agregar zona de drop sobre el área de chat completa (en `page.tsx`, el div scrollable):

**En `page.tsx`:**
```tsx
const [dragOver, setDragOver] = useState(false);
const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

// En el div principal:
onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
onDragLeave={() => setDragOver(false)}
onDrop={handleDrop}
```

Cuando se suelta un archivo → `POST /api/upload` → guardar en `pendingAttachment`.

**En `InputBox.tsx`**, agregar prop `attachment` y mostrarlo sobre el input:
```
┌─────────────────────────────┐
│ 📎 documento.pdf  [×]       │  ← preview del attachment
├─────────────────────────────┤
│ Escribe tu mensaje...  [→]  │
└─────────────────────────────┘
```

Al enviar: incluir el attachment en el mensaje como contexto adicional:
- Imagen: `[Imagen adjunta: ${filename}]\n[base64 data]`  → el backend lo detecta y lo pasa a la API de visión
- Texto: `[Archivo adjunto: ${filename}]\n\`\`\`\n${content}\n\`\`\``

### 3.3 Modificar `backend/routes/chat_ws.py`

Detectar en el mensaje si contiene `[Imagen adjunta:` con base64 y construir el mensaje con content array `[{type: "image_url", ...}, {type: "text", ...}]` para la API.

---

## FASE 4 — Búsqueda Global en Conversaciones

### 4.1 Backend: nuevo endpoint en `backend/routes/sessions.py`

`GET /api/sessions/search?q=<query>&limit=20`

Query SQL sobre `sessions.db`:
```sql
SELECT s.id, s.title, s.created_at,
       m.content, m.role, m.created_at as msg_time
FROM sessions s
JOIN messages m ON m.session_id = s.id
WHERE m.content LIKE '%' || :q || '%'
ORDER BY m.created_at DESC
LIMIT :limit
```

Devolver: `[{ session_id, session_title, snippet, role, timestamp }]`
- `snippet`: 120 chars alrededor del match con `...` de padding

### 4.2 Frontend: `frontend/src/components/ui/SearchPanel.tsx`

Panel deslizable desde arriba (o modal) con:
- Input de búsqueda (debounced 300ms)
- Resultados agrupados por sesión
- Cada resultado muestra: título de sesión, snippet con el match resaltado, fecha
- Click en resultado → navegar a `/` y cargar esa sesión (`handleSelectSession(session_id)`)

Integrar en el Command Palette (Fase 1) como acción, y también accesible desde el top bar.

---

## FASE 5 — Panel de Memoria Activa

### 5.1 Backend: `GET /api/memory`

Leer el archivo de memoria del sistema Hermès (probablemente en `/root/.claude/projects/*/memory/` o similar según cómo esté configurado Hermès en el VPS). 

Alternativa más simple: Hermès puede escribir un JSON resumen de su contexto activo en `/tmp/hermes_memory_summary.json` como parte de su ciclo de trabajo. El endpoint simplemente lee ese archivo.

Estructura del JSON:
```json
{
  "updated_at": "2026-06-30T...",
  "active_projects": ["hermes-dash", "hermes-gateway"],
  "recent_decisions": ["...", "..."],
  "user_preferences": ["prefiere respuestas cortas", "..."],
  "pending_tasks": ["...", "..."]
}
```

### 5.2 Frontend: `frontend/src/components/chat/MemoryPanel.tsx`

Panel lateral (slide-in desde la derecha, o expandible) accesible desde el top bar con un ícono de cerebro/chip:
- Sección "Proyectos activos"
- Sección "Contexto reciente"
- Sección "Tareas pendientes"
- Timestamp "Actualizado hace X min"
- Botón "Refrescar"

---

## FASE 6 — Activity Feed en Tiempo Real

### 6.1 Backend: SSE endpoint `GET /api/activity/stream`

Server-Sent Events que emite eventos cuando:
- Un job de cron empieza/termina (leer logs de systemd/cron)
- Una repo se sincroniza
- El gateway reinicia
- Hay errores

Usar `asyncio.Queue` en FastAPI con `EventSourceResponse` (instalar `sse-starlette`):
```python
from sse_starlette.sse import EventSourceResponse

@router.get("/activity/stream")
async def activity_stream(request: Request):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            event = await activity_queue.get()
            yield {"data": json.dumps(event)}
    return EventSourceResponse(event_generator())
```

### 6.2 Frontend: `frontend/src/store/useActivityStore.ts`

Zustand store que:
- Conecta al SSE en `EventSource('/api/proxy/api/activity/stream')`
- Mantiene los últimos 50 eventos en memoria
- Expone `events: ActivityEvent[]`

```ts
interface ActivityEvent {
  id: string;
  type: 'job' | 'repo' | 'gateway' | 'error' | 'info';
  message: string;
  timestamp: string;
  project?: string;
}
```

### 6.3 Frontend: Widget en Dashboard + indicador en top bar

- En bento dashboard: widget ActivityFeed (full-width) con lista scrollable de eventos
- En top bar: punto pulsante (igual al de conexión) que indica actividad reciente

---

## FASE 7 — Orb Ambiental (mejora estética)

### 7.1 Modificar `frontend/src/components/orb/OrbCanvas.tsx`

Hacer que el orb reaccione a más variables:

```ts
// Variables a consumir:
const { cpu_pct, ram_pct } = useHermesStore(s => s.system);  // ya existe
const hour = new Date().getHours();
const { events } = useActivityStore();
const recentError = events[0]?.type === 'error';
```

**Comportamiento:**
- **Hora del día**: color base del orb cambia suavemente
  - 6-12 (mañana): tono más cálido/dorado
  - 12-18 (tarde): cyan puro (color actual)
  - 18-24 (noche): púrpura/índigo
  - 0-6 (madrugada): azul oscuro muy tenue
- **CPU alto (>80%)**: orb pulsa más rápido, partículas más agitadas
- **Error reciente**: destello rojo suave por 3 segundos
- **Gateway offline**: orb se apaga parcialmente (brillo reducido al 20%)

Implementar pasando props/context al canvas WebGL o modificando los uniforms del shader si usa WebGL, o los parámetros de animación si es canvas 2D.

---

## FASE 8 — Voice History Visual

### 8.1 Modificar `frontend/src/components/chat/Message.tsx`

Agregar soporte para mensajes de voz. Cuando `message.source === 'voice'` (agregar este campo):
- Mostrar ícono de micrófono pequeño junto al avatar
- Borde izquierdo con acento diferente (ej: púrpura en vez de cyan)
- Duración aproximada (estimada por `words / 150 * 60` segundos)

### 8.2 Modificar `frontend/src/app/page.tsx`

En `handleVoiceResult`, al llamar `sendMessage`, pasar metadata:
```ts
sendMessage(text, { source: 'voice' });
```

### 8.3 Modificar `frontend/src/store/useChatStore.ts`

El tipo `Message` ya tiene lo necesario, agregar campo:
```ts
interface Message {
  // ... campos existentes
  source?: 'text' | 'voice';
}
```

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
Fase 1 (Command Palette)     — 2-3h — solo frontend, alto impacto visual
Fase 2 (Bento Dashboard)     — 3-4h — solo frontend, el cambio más vistoso  
Fase 8 (Voice Visual)        — 30min — trivial, mejora lo que ya funciona
Fase 4 (Búsqueda Global)     — 2h — backend simple + frontend
Fase 3 (Drag & Drop)         — 3h — requiere backend nuevo
Fase 5 (Memoria Activa)      — 1-2h — depende de cómo esté estructurada la memoria de Hermès
Fase 6 (Activity Feed)       — 3-4h — SSE backend + store + widgets
Fase 7 (Orb Ambiental)       — 1-2h — necesita entender cómo está hecho el canvas
```

**Total estimado: ~16-19h de implementación.**

---

## NOTAS TÉCNICAS IMPORTANTES

1. **Proxy Vercel**: todos los endpoints nuevos de backend deben ser accesibles via `/api/proxy/api/...`. Verificar que `frontend/src/app/api/proxy/[...path]/route.ts` no tenga restricciones de rutas.

2. **Tipos TypeScript**: mantener tipos estrictos. No usar `any`. Si necesitas tipos para la Web Speech API ya están en VoiceButton.tsx como referencia.

3. **CSS Variables**: usar siempre `var(--cyan)`, `var(--card)`, `var(--hairline)`, `var(--text)`, `var(--text-muted)`, `var(--text-faint)`, `var(--error)`, `var(--success)`, `var(--void)`. No hardcodear colores hex en componentes nuevos.

4. **Commit por fase**: hacer un commit separado por cada fase completada con mensaje descriptivo. Así el review es fase por fase.

5. **Instalar dependencias Python si se necesitan**: `pdfplumber` para PDFs, `sse-starlette` para SSE. Agregarlas a `backend/requirements.txt`.

6. **No tocar**: `chat_ws.py` (rutas de WebSocket), `hermes-tunnel.sh`, `hermes-gateway.service` — son críticos y estables.

---

## CHECKPOINT DE REVIEW

Después de implementar cada fase, hacer commit y push. El revisor verificará:
- [ ] Fase 1: Command Palette abre con Cmd+K, filtra, ejecuta acciones
- [ ] Fase 2: Dashboard muestra bento grid con widgets con datos reales
- [ ] Fase 3: Soltar archivo en chat lo adjunta y Hermès lo procesa
- [ ] Fase 4: Buscar texto encuentra mensajes de conversaciones pasadas
- [ ] Fase 5: Panel de memoria muestra contexto activo de Hermès
- [ ] Fase 6: Feed muestra eventos en tiempo real sin polling
- [ ] Fase 7: Orb cambia según hora y estado del sistema
- [ ] Fase 8: Mensajes de voz tienen marca visual diferente
