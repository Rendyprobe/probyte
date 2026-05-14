import type { ServerResponse } from "node:http";
import { env } from "../config/env";

export function setCors(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", env.corsOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,x-callback-token,webhook-id");
  res.setHeader("Vary", "Origin");
}
