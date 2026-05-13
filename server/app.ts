import http from "node:http";
import { env } from "./config/env";
import { route } from "./routes";

const server = http.createServer((req, res) => {
  void route(req, res).catch((error) => {
    console.error(error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "INTERNAL_ERROR" }));
  });
});

server.listen(env.apiPort, "0.0.0.0", () => {
  console.log(`ProByte API listening on http://localhost:${env.apiPort}`);
});

export { server };
