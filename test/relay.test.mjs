import assert from "node:assert/strict";
import { test } from "node:test";

import { CALLBACK_PATH, resolveTarget } from "../google/callback/relay.js";

function stateFor(callbackUrl, nonce = "5d967ad738274fdd8cb773c5c96924b3") {
  return `${nonce}.${Buffer.from(callbackUrl).toString("base64url")}`;
}

function googleReturn(state, extra = "") {
  return `?state=${encodeURIComponent(state)}&code=4%2F0Ab_x-yz&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.readonly${extra}`;
}

test("forwards to an https install with Google's query string untouched", () => {
  const search = googleReturn(stateFor(`https://aura.example.com${CALLBACK_PATH}`), "&authuser=0&prompt=consent");
  assert.equal(resolveTarget(search), `https://aura.example.com${CALLBACK_PATH}${search}`);
});

test("keeps a non-default port on the install origin", () => {
  const search = googleReturn(stateFor(`https://192.168.101.158:8443${CALLBACK_PATH}`));
  assert.equal(resolveTarget(search), `https://192.168.101.158:8443${CALLBACK_PATH}${search}`);
});

test("accepts plain http only on loopback", () => {
  for (const host of ["localhost:8093", "127.0.0.1:8093", "[::1]:8093"]) {
    const search = googleReturn(stateFor(`http://${host}${CALLBACK_PATH}`));
    assert.equal(resolveTarget(search), `http://${host}${CALLBACK_PATH}${search}`, host);
  }
  assert.equal(resolveTarget(googleReturn(stateFor(`http://192.168.101.158${CALLBACK_PATH}`))), null);
  assert.equal(resolveTarget(googleReturn(stateFor(`http://aura.example.com${CALLBACK_PATH}`))), null);
});

test("forwards a Google error too, so the install can report it", () => {
  const search = `?error=access_denied&state=${encodeURIComponent(stateFor(`https://aura.example.com${CALLBACK_PATH}`))}`;
  assert.equal(resolveTarget(search), `https://aura.example.com${CALLBACK_PATH}${search}`);
});

test("refuses any path other than the Aura callback", () => {
  for (const path of ["/", "/admin/auth/google/callback/", "/admin/auth/google/callbackX", "/admin/auth/google", "/evil"]) {
    assert.equal(resolveTarget(googleReturn(stateFor(`https://aura.example.com${path}`))), null, path);
  }
});

test("refuses targets carrying credentials, a query or a fragment", () => {
  for (const url of [
    `https://user:pass@aura.example.com${CALLBACK_PATH}`,
    `https://user@aura.example.com${CALLBACK_PATH}`,
    `https://aura.example.com${CALLBACK_PATH}?next=https://evil.example`,
    `https://aura.example.com${CALLBACK_PATH}#x`,
  ]) {
    assert.equal(resolveTarget(googleReturn(stateFor(url))), null, url);
  }
});

test("refuses non-web schemes", () => {
  for (const url of ["javascript:alert(1)//" + CALLBACK_PATH, `data:text/html,${CALLBACK_PATH}`, `ftp://aura.example.com${CALLBACK_PATH}`]) {
    assert.equal(resolveTarget(googleReturn(stateFor(url))), null, url);
  }
});

test("refuses a missing, unmarked or undecodable state", () => {
  assert.equal(resolveTarget("?code=abc"), null);
  assert.equal(resolveTarget(""), null);
  assert.equal(resolveTarget("?state=5d967ad738274fdd8cb773c5c96924b3"), null);
  assert.equal(resolveTarget(`?state=.${Buffer.from(`https://a.example${CALLBACK_PATH}`).toString("base64url")}`), null);
  assert.equal(resolveTarget("?state=nonce.%%%not-base64%%%"), null);
  assert.equal(resolveTarget(`?state=nonce.${Buffer.from("not a url").toString("base64url")}`), null);
});
