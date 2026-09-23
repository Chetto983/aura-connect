import assert from "node:assert/strict";
import { test } from "node:test";

import { CALLBACK_PATHS, resolveTarget } from "../mcp/callback/relay.js";

const COCKPIT = "/api/governance/mcp/authorization/callback";
const CLI = "/aura/mcp/oauth/callback";

// The Go MCP SDK issues a base32 state with no dot; Aura appends the install's callback.
function stateFor(callbackUrl, nonce = "UCPPUGJZ4DXVXG6NQW6SMRRDOZ") {
  return `${nonce}.${Buffer.from(callbackUrl).toString("base64url")}`;
}

function serverReturn(state, extra = "") {
  return `?code=eyJhbGciOi.probe&state=${encodeURIComponent(state)}&iss=https%3A%2F%2Fapi.us.elevenlabs.io${extra}`;
}

test("names exactly the cockpit and the CLI callbacks", () => {
  assert.deepEqual([...CALLBACK_PATHS].sort(), [CLI, COCKPIT].sort());
});

test("forwards to the cockpit with the server's query string untouched, iss included", () => {
  const search = serverReturn(stateFor(`https://aura.example.com${COCKPIT}`));
  assert.equal(resolveTarget(search), `https://aura.example.com${COCKPIT}${search}`);
});

test("forwards to the CLI's loopback listener on its ephemeral port", () => {
  const search = serverReturn(stateFor(`http://127.0.0.1:53917${CLI}`));
  assert.equal(resolveTarget(search), `http://127.0.0.1:53917${CLI}${search}`);
});

test("reaches a LAN cockpit only over https, never plain http", () => {
  const https = serverReturn(stateFor(`https://192.168.1.225:9443${COCKPIT}`));
  assert.equal(resolveTarget(https), `https://192.168.1.225:9443${COCKPIT}${https}`);
  assert.equal(resolveTarget(serverReturn(stateFor(`http://192.168.1.225:9080${COCKPIT}`))), null);
});

test("forwards a refusal too, so the install can report it", () => {
  const search = `?error=access_denied&state=${encodeURIComponent(stateFor(`http://localhost:9080${COCKPIT}`))}`;
  assert.equal(resolveTarget(search), `http://localhost:9080${COCKPIT}${search}`);
});

test("refuses the Google callback and every other path", () => {
  for (const path of ["/admin/auth/google/callback", `${COCKPIT}/`, `${CLI}X`, "/", "/evil"]) {
    assert.equal(resolveTarget(serverReturn(stateFor(`https://aura.example.com${path}`))), null, path);
  }
});

test("refuses targets carrying credentials, a query or a fragment", () => {
  for (const url of [
    `https://user:pass@aura.example.com${COCKPIT}`,
    `https://aura.example.com${COCKPIT}?next=https://evil.example`,
    `https://aura.example.com${COCKPIT}#x`,
  ]) {
    assert.equal(resolveTarget(serverReturn(stateFor(url))), null, url);
  }
});
