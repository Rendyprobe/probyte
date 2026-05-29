import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { route } from "../server/routes";

import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "node:http";

describe("server request hardening", () => {
  it("returns 400 for malformed encoded route params", async () => {
    const response = await request("GET", "/api/invoices/%E0%A4%A");

    assert.equal(response.status, 400);
    assert.deepEqual(response.json, { error: "INVALID_URL" });
  });

  it("rejects SQL-injection-shaped invoice params before database access", async () => {
    const response = await request("GET", "/api/invoices/%27%20OR%201%3D1--");

    assert.equal(response.status, 400);
    assert.deepEqual(response.json, { error: "INVALID_INVOICE" });
  });

  it("rejects SQL-injection-shaped query filters before database access", async () => {
    const response = await request("GET", "/api/reviews?productId=%27%20OR%201%3D1--");

    assert.equal(response.status, 400);
    assert.deepEqual(response.json, { error: "INVALID_REQUEST" });
  });
});

async function request(method: string, url: string) {
  const req = new TestIncomingMessage(method, url);
  const res = new TestServerResponse();
  await route(req as unknown as IncomingMessage, res as unknown as ServerResponse);
  return {
    status: res.status,
    json: JSON.parse(res.body || "{}") as Record<string, unknown>
  };
}

class TestIncomingMessage implements AsyncIterable<Uint8Array> {
  headers: IncomingHttpHeaders = { host: "localhost" };
  socket = { remoteAddress: "127.0.0.1" };

  constructor(
    public method: string,
    public url: string
  ) {}

  async *[Symbol.asyncIterator]() {
    return;
  }
}

class TestServerResponse {
  status = 200;
  headers = new Map<string, string>();
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
    this.body = chunk instanceof Uint8Array ? new TextDecoder().decode(chunk) : chunk ?? "";
  }
}
