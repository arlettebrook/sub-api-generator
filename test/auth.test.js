import test from "node:test";
import assert from "node:assert/strict";
import {
  handleLogin,
  handleLogout,
  isAuthenticated,
  sha256Hex,
} from "../src/auth.js";

test("hashes passwords and validates auth cookies", async () => {
  const hash = await sha256Hex("secret");
  assert.equal(hash.length, 64);
  assert.equal(isAuthenticated(new Request("https://example.test", {
    headers: { Cookie: `foo=1; auth=${hash}; bar=2` },
  }), hash), true);
  assert.equal(isAuthenticated(new Request("https://example.test", {
    headers: { Cookie: `notauth=${hash}` },
  }), hash), false);
});

test("returns a redirect and cookie after successful login", async () => {
  const hash = await sha256Hex("secret");
  const response = await handleLogin(new Request("https://example.test/login", {
    method: "POST",
    body: new URLSearchParams({ password: "secret" }),
  }), hash, async () => "login");
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "https://example.test/");
  assert.match(response.headers.get("set-cookie"), new RegExp(`auth=${hash}`));
});

test("returns the login page after failed login and clears logout cookie", async () => {
  const hash = await sha256Hex("secret");
  const failed = await handleLogin(new Request("https://example.test/login", {
    method: "POST",
    body: new URLSearchParams({ password: "wrong" }),
  }), hash, async (message) => `<p>${message}</p>`);
  assert.equal(failed.status, 200);
  assert.match(await failed.text(), /密码错误/);

  const logout = handleLogout(new Request("https://example.test/logout", { method: "POST" }));
  assert.equal(logout.status, 303);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
});
