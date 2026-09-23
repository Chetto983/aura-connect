import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The rules below are draft-ietf-oauth-client-id-metadata-document-00 and the MCP
// 2025-11-25 authorization spec; an authorization server refuses a document breaking any
// of them, and the only symptom an install sees is "invalid_client".
const PUBLISHED_AT = "https://chetto1983.github.io/aura-connect/mcp/client-metadata.json";
const RELAY = "https://chetto1983.github.io/aura-connect/mcp/callback/";

const raw = readFileSync(new URL("../mcp/client-metadata.json", import.meta.url));
const doc = JSON.parse(raw);

test("client_id is the exact URL the document is published at", () => {
  assert.equal(doc.client_id, PUBLISHED_AT);
});

test("carries the fields MCP requires", () => {
  assert.equal(doc.client_name, "Aura");
  assert.ok(Array.isArray(doc.redirect_uris));
});

test("the relay is the only redirect, on the client_id's own host", () => {
  assert.deepEqual(doc.redirect_uris, [RELAY]);
  assert.equal(new URL(RELAY).host, new URL(PUBLISHED_AT).host);
});

test("is a public client: no secret, no shared-secret auth method", () => {
  assert.equal(doc.client_secret, undefined);
  assert.equal(doc.client_secret_expires_at, undefined);
  assert.equal(doc.token_endpoint_auth_method, "none");
});

test("asks for refresh tokens, which Aura stores encrypted per identity", () => {
  assert.deepEqual(doc.grant_types, ["authorization_code", "refresh_token"]);
  assert.deepEqual(doc.response_types, ["code"]);
});

test("stays under the 5 KB an authorization server is advised to fetch", () => {
  assert.ok(raw.length < 5 * 1024, `${raw.length} bytes`);
});
