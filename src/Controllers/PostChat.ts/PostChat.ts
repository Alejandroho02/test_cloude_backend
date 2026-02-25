import { Response, Request } from "express";
import { streamClaudeResponse } from "../../Services/cloudeService";
import { handleError } from "../../utils/handleError";

export const ClaudeConexionController = async (req: Request, res: Response) => {
  const { message, history = [] } = req.body;

  if (!message) {
    handleError(res, 400, "Message_require", "Message required");
    return;
  }

  const messages = [...history, { role: "user" as const, content: message }];

  let isClosed = false;
  let chunkCount = 0;
  const startTime = Date.now();

  try {
    // Evita que la conexión se cierre por timeout en el socket/response
    req.socket?.setTimeout?.(0);
    res.setTimeout?.(0);
    // Mantener el socket vivo
    try {
      req.socket?.setKeepAlive?.(true);
    } catch {}

    console.log("SSE connection opened", {
      ip: req.ip || req.socket?.remoteAddress,
      port: req.socket?.remotePort,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Enviar un mensaje inicial para verificar que el cliente recibe datos
    try {
      res.write(
        `data: ${JSON.stringify({ type: "info", text: "connected" })}\n\n`,
      );
      (res as any).flush?.();
      console.log("Initial connected event sent");
    } catch (e) {
      console.warn("Could not send initial connected event", e);
    }

    const heartbeat = setInterval(() => {
      if (!isClosed) {
        res.write(": heartbeat\n\n");
      }
    }, 15000);

    req.on("close", () => {
      isClosed = true;
      clearInterval(heartbeat);
      console.log(new Date().toISOString(), "🔌 Client disconnected", {
        chunkCount,
        elapsedMs: Date.now() - startTime,
      });
    });

    const sendChunk = (chunk: string) => {
      if (isClosed) return;
      chunkCount++;
      console.log(
        "Sending chunk #",
        chunkCount,
        "(len):",
        chunk.length,
        "preview:",
        chunk.slice(0, 80),
      );
      res.write(`data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`);
      try {
        (res as any).flush?.(); // fuerza el envío inmediato si está disponible
      } catch (e) {
        // no crítico
      }
    };

    const done = () => {
      if (isClosed) return;
      console.log("SSE done -> closing response", {
        chunkCount,
        elapsedMs: Date.now() - startTime,
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    };

    const onStreamError = (err: unknown) => {
      console.error("Claude stream error:", err);
      if (isClosed) return;
      res.write(
        `data: ${JSON.stringify({ type: "error", message: "Stream error" })}\n\n`,
      );
      res.end();
    };

    await streamClaudeResponse(messages, sendChunk, done, onStreamError);
  } catch (err) {
    console.error("Controller error:", err);

    if (!res.headersSent) {
      handleError(res, 500, "Internal_server_error", "internal server error");
      return;
    }

    if (!isClosed) {
      res.end();
    }
  }
};
export const ClaudeGetStreamController = async (req: Request, res: Response) => {
  const { message, history: historyB64 } = req.query as {
    message?: string;
    history?: string;
  };

  if (!message) {
    handleError(res, 400, "Message_require", "Message required");
    return;
  }

  let history: Array<{ role: "user" | "assistant"; content: string }> = [];

  if (historyB64) {
    try {
      const decoded = Buffer.from(historyB64, "base64").toString("utf8");
      history = JSON.parse(decoded);
    } catch (e) {
      console.warn("Invalid history param", e);
    }
  }

  const messages = [...history, { role: "user" as const, content: message }];

  let isClosed = false;

  try {
    req.socket?.setTimeout?.(0);
    res.setTimeout?.(0);
    req.socket?.setKeepAlive?.(true);

    console.log("SSE GET connection opened", {
      ip: req.ip || req.socket?.remoteAddress,
      port: req.socket?.remotePort,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    // ping inicial
    res.write(`data: ${JSON.stringify({ type: "info", text: "connected" })}\n\n`);

    const heartbeat = setInterval(() => {
      if (!isClosed) res.write(": heartbeat\n\n");
    }, 15000);

    req.on("close", () => {
      isClosed = true;
      clearInterval(heartbeat);
      console.log("🔌 Client disconnected (GET)");
    });

    const sendChunk = (chunk: string) => {
      if (isClosed) return;
      res.write(`data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`);
    };

    const done = () => {
      if (isClosed) return;
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    };

    const onStreamError = (err: unknown) => {
      console.error("Claude stream error (GET):", err);
      if (isClosed) return;
      res.write(`data: ${JSON.stringify({ type: "error" })}\n\n`);
      res.end();
    };

    await streamClaudeResponse(messages, sendChunk, done, onStreamError);
  } catch (err) {
    console.error("Controller GET error:", err);
    if (!res.headersSent) {
      handleError(res, 500, "Internal_server_error", "internal server error");
      return;
    }
    if (!isClosed) res.end();
  }
};