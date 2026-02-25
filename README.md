# Radii Copilot — Backend

Proxy server en Node.js + Express que conecta el frontend con la API de Claude (Anthropic). Maneja el streaming via Server-Sent Events y aplica el system prompt de operaciones de Radii.

> **Repo frontend:** [test_cloude_frontend](https://github.com/Alejandroho02/test_cloude_frontend)

---

## Requisitos

- Node.js 18+
- API Key de Anthropic

---

## Instalación y uso

```bash
# 1. Clonar el repo
git clone https://github.com/tu-usuario/test_cloude_backend.git
cd test_cloude_backend

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env
# Editar .env y agregar tu API key

# 4. Correr en desarrollo
npm run dev
```

El servidor corre en `http://localhost:8000`.

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=8000
```

> ⚠️ **Nunca subas `.env` al repositorio.** Está incluido en `.gitignore`.

`.env.example` (este sí se sube):
```env
ANTHROPIC_API_KEY=
PORT=8000
```

---

## Estructura del proyecto

```
src/
├── Controllers/    # Lógica de cada endpoint
├── interfaces/     # Tipos TypeScript compartidos
├── routes/         # Definición de rutas Express
├── Services/       # Lógica de negocio (llamadas a Claude API)
├── utils/          # Helpers y utilidades
├── server/         # Configuración del servidor Express
└── App.ts          # Entry point
```

---

## Endpoints

### `GET /api/chat`

Recibe un mensaje del operador y responde con streaming SSE desde Claude.

**Query params:**

| Param | Tipo | Descripción |
|---|---|---|
| `message` | `string` | Mensaje del operador |
| `history` | `string` | Historial de conversación en Base64 (JSON codificado) |

**Response:** `text/event-stream`

Cada evento SSE tiene esta forma:

```json
{ "type": "text", "text": "fragmento de respuesta" }
```

Eventos especiales:

```json
{ "type": "info" }        // señal de inicio
{ "done": true }          // fin del stream
{ "type": "error" }       // error en el stream
```

**Ejemplo de request:**

```
GET /api/chat?message=Hola&history=W3sicm9sZSI6InVzZXIiLCAiY29udGVudCI6ICJIb2xhIn1d
```

---

## Action Cards

Claude genera Action Cards dentro del stream usando delimitadores:

```
<<<ACTION_CARD_START>>>
{
  "title": "Nueva Cotización",
  "text": ["El cliente solicita brackets de aluminio"],
  "form": [
    { "label": "Cliente", "name": "cliente", "value": null },
    { "label": "Material", "name": "material", "value": "Aluminio 6061" }
  ],
  "actions": [
    { "label": "✓ Crear cotización", "action": "create" },
    { "label": "✕ Descartar", "action": "dismiss" }
  ]
}
<<<ACTION_CARD_END>>>
```

El frontend parsea estos bloques en tiempo real y renderiza las cards interactivas conforme llegan.

---

## Scripts

```bash
npm run dev      # Desarrollo con hot reload (ts-node-dev)
npm run build    # Compilar TypeScript a dist/
npm run start    # Correr build de producción
npm run clean    # Limpiar carpeta dist/
```

---

## Decisiones técnicas

### 1. Node.js como proxy (no exponer API key)

La API key de Anthropic nunca sale del servidor. El frontend solo conoce la URL del backend — esto es obligatorio para cualquier integración con LLMs en producción.

### 2. Server-Sent Events (SSE) sobre WebSockets

SSE es unidireccional (servidor → cliente), lo cual es exactamente lo que necesita el streaming de Claude. Es más simple que WebSockets, nativo en el browser, y no requiere librerías adicionales en el cliente.

### 3. Historial en Base64

El historial de conversación se envía como parámetro GET codificado en Base64. Esto permite que el backend sea stateless — no necesita sesiones ni base de datos para mantener el contexto de la conversación.

### 4. Delimitadores `<<<ACTION_CARD_START>>>`

Se eligió este approach sobre tool use de Claude porque es el único compatible con streaming en tiempo real. Con tool use, Claude interrumpe el stream para ejecutar la tool — con delimitadores, las cards aparecen progresivamente conforme Claude las genera, sin cortar el flujo de texto.

### 5. TypeScript en el backend

Tipado compartido entre frontend y backend via interfaces. Reduce errores en el contrato de datos (mensajes, cards, eventos SSE).

---

## Stack

| Tecnología | Uso |
|---|---|
| Node.js + Express 5 | Servidor HTTP |
| TypeScript | Tipado estático |
| @anthropic-ai/sdk | Cliente oficial de Claude API |
| ts-node-dev | Hot reload en desarrollo |
| dotenv | Variables de entorno |
| cors | Cross-origin para el frontend |
