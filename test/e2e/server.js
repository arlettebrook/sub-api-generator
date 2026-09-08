import http from "node:http";
import worker from "../../src/index.js";

const values = {
  subs: { "e.ye.gs": { remark: "e.ye.gs" } },
  apis: { "https://api.example.com": { remark: "测试 API" } },
  custom_apis: {},
};
const detectionHistory = [];
const DB = {
  prepare(sql) {
    return {
      bind(...params) {
        return {
          async run() {
            if (/INSERT INTO detection_history/i.test(sql)) {
              const [api_path, detected_at, raw_count, kept_count, filtered_count, error_count, nodes_json, raw_nodes_json, raw_sources_json, node_sources_json, source_meta_json] = params;
              detectionHistory.push({ id: detectionHistory.length + 1, api_path, detected_at, raw_count, kept_count, filtered_count, error_count, nodes_json, raw_nodes_json, raw_sources_json, node_sources_json, source_meta_json });
            }
            if (/DELETE FROM detection_history/i.test(sql)) {
              const path = params[0];
              const keep = Number(params[2] || 50);
              const matches = detectionHistory.filter((row) => row.api_path === path).sort((a, b) => b.detected_at - a.detected_at || b.id - a.id).slice(0, keep).map((row) => row.id);
              for (let index = detectionHistory.length - 1; index >= 0; index -= 1) {
                if (detectionHistory[index].api_path === path && !matches.includes(detectionHistory[index].id)) detectionHistory.splice(index, 1);
              }
            }
            return { success: true };
          },
          async all() {
            const path = params[0];
            const limit = Number(params[1] || 10);
            const offset = Number(params[2] || 0);
            const results = detectionHistory.filter((row) => row.api_path === path).sort((a, b) => b.detected_at - a.detected_at || b.id - a.id).slice(offset, offset + limit);
            return { results };
          },
          async first() { return { total: detectionHistory.filter((row) => row.api_path === params[0]).length }; },
        };
      },
    };
  },
};

const env = {
  PASSWORD: "secret",
  KV: {
    async get(key) { return values[key] ?? null; },
    async put(key, value) { values[key] = JSON.parse(value); },
  },
  DB,
};

const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url;
  if (url === "https://api.example.com") return new Response("2.2.2.2:443#api\n3.3.3.3:443#api", { status: 200 });
  if (url === "https://e.ye.gs" || url === "https://e.ye.gs/") return new Response("1.1.1.1:443#sub", { status: 200 });
  return nativeFetch(input, init);
};

const server = http.createServer(async (request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok");
    return;
  }

  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) headers.set(key, value.join(", "));
    else if (value !== undefined) headers.set(key, value);
  }
  const webRequest = new Request(`http://127.0.0.1:4173${request.url}`, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : body,
  });
  const result = await worker.fetch(webRequest, env);
  const outputHeaders = {};
  result.headers.forEach((value, key) => { outputHeaders[key] = value; });
  response.writeHead(result.status, outputHeaders);
  response.end(Buffer.from(await result.arrayBuffer()));
});

server.listen(4173, "127.0.0.1");
