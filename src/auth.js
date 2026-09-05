import { redirectResponse, withSecurityHeaders } from "./http.js";

const AUTH_COOKIE_REGEX = /(?:^|;\s*)auth=([a-f0-9]{64})(?:;|$)/;

export async function sha256Hex(str) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.prototype.map
    .call(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function isAuthenticated(request, validHash) {
  const cookie = request.headers.get("Cookie") || "";
  const match = AUTH_COOKIE_REGEX.exec(cookie);
  return !!(match && match[1] === validHash);
}

export async function handleLogin(request, validHash, loginPage) {
  const formData = await request.formData();
  const password = (formData.get("password") || "").toString();
  const inputHash = await sha256Hex(password);

  if (inputHash === validHash) {
    const secure = new URL(request.url).protocol === "https:";
    return redirectResponse(request, "/", {
      "cache-control": "no-store",
      "set-cookie": `auth=${validHash}; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=2592000`,
    });
  }

  return new Response(await loginPage("密码错误，请重试 🔒"), {
    headers: withSecurityHeaders({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    }),
  });
}

export function handleLogout(request) {
  const secure = new URL(request.url).protocol === "https:";
  return redirectResponse(request, "/", {
    "set-cookie": `auth=; Path=/; HttpOnly; ${secure ? "Secure; " : ""}SameSite=Lax; Max-Age=0`,
    "cache-control": "no-store",
  });
}

