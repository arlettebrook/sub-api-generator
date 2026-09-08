import http from "node:http";
import worker from "../../src/index.js";

const values = {
  subs: { "e.ye.gs": { remark: "e.ye.gs" } },
  apis: { "https://api.example.com": { remark: "测试 API" } },
  custom_apis: {},
};

const env = {
  PASSWORD: "secret",
  KV: {
    async get(key) { return values[key] ?? null; },
    async put(key, value) { values[key] = JSON.parse(value); },
  },
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
