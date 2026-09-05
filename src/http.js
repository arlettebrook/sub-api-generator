export function withSecurityHeaders(headers = {}) {
  const result = new Headers(headers);
  result.set("x-content-type-options", "nosniff");
  result.set("x-frame-options", "DENY");
  result.set("referrer-policy", "no-referrer");
  return result;
}

export function textResponse(message, status = 200, headers = {}) {
  return new Response(message, {
    status,
    headers: withSecurityHeaders({
      "content-type": "text/plain; charset=utf-8",
      ...headers,
    }),
  });
}

export function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: withSecurityHeaders({
      "content-type": "application/json; charset=utf-8",
      ...headers,
    }),
  });
}

export function methodNotAllowed(allow) {
  return textResponse("Method Not Allowed", 405, { Allow: allow });
}

export function redirectResponse(request, pathname, headers = {}) {
  const result = withSecurityHeaders(headers);
  result.set("location", new URL(pathname, request.url).toString());
  return new Response(null, { status: 303, headers: result });
}

