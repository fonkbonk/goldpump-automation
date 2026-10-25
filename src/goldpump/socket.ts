import { io, type Socket } from "socket.io-client";
import { loadConfig } from "../config.js";
import type { RainDocument, StreamPayload } from "./types.js";
import { authSocket, createGoldPumpHttp } from "./http.js";
import { log } from "../util/log.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type RainListenerCallbacks = {
  onRain: (rain: RainDocument | undefined) => void;
  onPoolValue: (value: number) => void;
};

function applyStreamLog<T extends { _id?: string }>(
  logDocs: T[],
  payload: StreamPayload,
  maxSize: number,
): T[] {
  let next = [...logDocs];
  if (payload.documents?.length) {
    for (const doc of payload.documents) {
      next.unshift(doc as T);
    }
    next = next.slice(0, maxSize);
  }
  if (payload.updates?.length) {
    for (const u of payload.updates) {
      const idx = next.findIndex((d) => d._id === u.documentId);
      if (idx === -1) continue;
      if ("hidden" in u.updatedFields) {
        next.splice(idx, 1);
      } else {
        const merged = { ...next[idx], ...u.updatedFields };
        for (const removed of u.removedFields ?? []) {
          delete (merged as Record<string, unknown>)[removed];
        }
        next[idx] = merged;
      }
    }
  }
  return next;
}

export class GoldPumpRainListener {
  private socket: Socket | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private rainLog: RainDocument[] = [];
  private valueLog: Array<{ _id?: string; tipAmount?: number; evAmount?: number }> = [];

  constructor(private cookieHeader: string) {}

  async start(callbacks: RainListenerCallbacks): Promise<() => void> {
    const cfg = loadConfig();
    const http = createGoldPumpHttp(this.cookieHeader);

    this.socket = io(cfg.GOLDPUMP_API_BASE, {
      transports: ["websocket"],
      extraHeaders: { Cookie: this.cookieHeader, "User-Agent": UA },
    });

    await new Promise<void>((resolve, reject) => {
      const s = this.socket!;
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        s.off("connect", onConnect);
        s.off("connect_error", onError);
      };
      s.on("connect", onConnect);
      s.on("connect_error", onError);
      if (s.connected) onConnect();
    });

    await authSocket(http, this.socket.id!);
    log("info", "GoldPump socket authenticated", { socketId: this.socket.id });

    const onRainStream = (payload: StreamPayload) => {
      this.rainLog = applyStreamLog(this.rainLog, payload, 1);
      callbacks.onRain(this.rainLog[0]);
    };
    const onValueStream = (payload: StreamPayload) => {
      this.valueLog = applyStreamLog(this.valueLog, payload, 1) as typeof this.valueLog;
      const row = this.valueLog[0];
      if (row) {
        callbacks.onPoolValue((row.tipAmount ?? 0) + (row.evAmount ?? 0));
      }
    };

    this.socket.on("rain-stream", onRainStream);
    this.socket.on("rain-value-stream", onValueStream);
    this.socket.emit("rain-join");
    this.pingTimer = setInterval(() => this.socket?.emit("rain-ping"), 4_000);

    return () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.socket?.emit("rain-leave");
      this.socket?.off("rain-stream", onRainStream);
      this.socket?.off("rain-value-stream", onValueStream);
      this.socket?.disconnect();
      this.socket = null;
    };
  }
}
