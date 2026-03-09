# CLAUDE.md — Radii Operations Copilot Backend

## Descripción del proyecto

Backend en **Express.js + TypeScript** que expone una API de chat con streaming (SSE) conectada a Claude (`claude-opus-4-6`). Funciona como copiloto de operaciones para Radii, empresa de Supply Chain (Aerospace, Automotive, Industrial).

## Stack

- **Runtime**: Node.js
- **Framework**: Express.js v5
- **Lenguaje**: TypeScript (ES2020, CommonJS)
- **IA**: `@anthropic-ai/sdk` — modelo `claude-opus-4-6`
- **Dev server**: `ts-node-dev`

## Comandos

```bash
npm run dev      # Desarrollo con hot-reload (ts-node-dev)
npm run build    # Compilar TypeScript → dist/
npm run start    # Correr build compilado
npm run clean    # Eliminar dist/
```

## Variables de entorno

Archivo `.env` en la raíz (no committear):

```
PORT=8000
ANTHROPIC_API_KEY=sk-ant-...
```

## Estructura del proyecto

```
src/
├── app.ts                          # Entry point — instancia y arranca Server
├── server/
│   └── Server.ts                   # Clase Server, middlewares, rutas dinámicas
├── routes/
│   └── chat.ts                     # Rutas: POST /api/chat, GET /api/chat
├── Controllers/
│   └── PostChat.ts/
│       └── PostChat.ts             # ClaudeConexionController (POST) y ClaudeGetStreamController (GET)
├── Services/
│   └── cloudeService.ts            # streamClaudeResponse — llama a Claude con streaming + continuaciones
├── interfaces/
│   └── ServerPath.ts               # Interface serverPaths { [key: string]: string }
└── utils/
    └── handleError.ts              # handleError(res, statusCode, errorType, devTool)
```

## Endpoints

| Método | Ruta       | Descripción                                          |
|--------|------------|------------------------------------------------------|
| POST   | /api/chat  | Body: `{ message: string, history?: [] }` → SSE     |
| GET    | /api/chat  | Query: `message`, `history` (base64 JSON) → SSE     |

### Formato de respuesta SSE

```
data: {"type":"info","text":"connected"}   ← ping inicial
data: {"type":"text","text":"...chunk..."}  ← fragmentos de texto
data: {"done":true}                         ← fin del stream
data: {"type":"error","message":"..."}      ← error
: heartbeat                                 ← keepalive cada 15s
```

## Comportamiento de Claude

El system prompt configura a Claude como copiloto de operaciones. Detecta acciones ejecutables y genera **ACTION CARDs** en JSON delimitadas por `<<<ACTION_CARD_START>>>` / `<<<ACTION_CARD_END>>>`.

### Tipos de ACTION CARD

| Situación                        | Tipo             | Acciones                                        |
|----------------------------------|------------------|-------------------------------------------------|
| Cliente solicita pieza           | Nueva Cotización | `create_quote`, `discard`                       |
| Responder a cliente              | Follow-up Email  | `send_email`, `discard`                         |
| Urgencia / alerta / info faltante| Flag / Alerta    | `acknowledge_flag`, `escalate`, `discard`       |
| Sugerir proveedor                | Supplier Match   | `contact_supplier`, `discard`                   |

### Esquema ACTION CARD

```json
{
  "title": "string",
  "text": ["string"],
  "form": [{ "label": "string", "name": "string", "value": "string|number|null", "type": "string" }],
  "actions": [{ "label": "string", "action": "string" }]
}
```

## Convenciones de código

- **Rutas**: Registradas dinámicamente en `Server.ts` — el nombre del archivo en `src/routes/` debe coincidir con la clave en `serverPaths`.
- **Errores HTTP**: Usar siempre `handleError(res, status, errorType, devMsg)`.
- **Streaming**: El servicio maneja continuaciones automáticas si Claude corta por `max_tokens` (hasta 3 veces).
- **Seguridad**: Nunca commitear `.env`. Regenerar la API key si fue expuesta accidentalmente.

## Agregar una nueva ruta

1. Crear `src/routes/<nombre>.ts` con un `Router` de Express y exportarlo como `default`.
2. Agregar la clave en `serverPaths` dentro de `Server.ts`:
   ```ts
   this.paths = {
     chat: "/api/chat",
     <nombre>: "/api/<nombre>",
   };
   ```
3. Crear el controller correspondiente en `src/Controllers/`.
