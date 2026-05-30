import { route } from "./routes";
import { setRuntimeEnv } from "./config/env";

import type { IncomingHttpHeaders } from "node:http";
import type { Socket } from "node:net";
import type { IncomingMessage, ServerResponse } from "node:http";

type WorkerEnv = Record<string, string | number | boolean | undefined>;

class WorkerIncomingMessage implements AsyncIterable<Uint8Array> {
  method: string;
  url: string;
  headers: IncomingHttpHeaders;
  socket: Pick<Socket, "remoteAddress">;
  private body: Uint8Array | null;

  constructor(request: Request) {
    const url = new URL(request.url);
    this.method = request.method;
    this.url = `${url.pathname}${url.search}`;
    this.headers = Object.fromEntries(Array.from(request.headers.entries()).map(([key, value]) => [key.toLowerCase(), value]));
    this.socket = { remoteAddress: request.headers.get("cf-connecting-ip") ?? "" };
    this.body = request.body ? new Uint8Array() : null;
  }

  async *[Symbol.asyncIterator]() {
    if (!this.body) return;
    yield this.body;
  }

  async loadBody(request: Request) {
    if (!request.body) return;
    this.body = new Uint8Array(await request.arrayBuffer());
  }
}

class WorkerServerResponse {
  status = 200;
  headers = new Headers();
  body = "";

  setHeader(name: string, value: number | string | readonly string[]) {
    this.headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
  }

  writeHead(status: number, headers?: Record<string, number | string | readonly string[]>) {
    this.status = status;
    if (headers) {
      for (const [key, value] of Object.entries(headers)) this.setHeader(key, value);
    }
  }

  end(chunk?: string | Uint8Array) {
    if (chunk instanceof Uint8Array) {
      this.body = new TextDecoder().decode(chunk);
      return;
    }
    this.body = chunk ?? "";
  }

  toResponse() {
    return new Response(this.body, {
      status: this.status,
      headers: this.headers
    });
  }
}

export default {
  async fetch(request: Request, workerEnv: WorkerEnv) {
    setRuntimeEnv(workerEnv);

    const req = new WorkerIncomingMessage(request);
    await req.loadBody(request);
    const res = new WorkerServerResponse();

    try {
      await route(req as unknown as IncomingMessage, res as unknown as ServerResponse);
    } catch (error) {
      console.error(error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "INTERNAL_ERROR" }));
    }

    return res.toResponse();
  }
};
