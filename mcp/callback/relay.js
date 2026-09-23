// A remote MCP server's authorization server redirects here when Aura signs in with its
// Client ID Metadata Document (../client-metadata.json), whose only redirect URI is this
// page. Two Aura callbacks can be named: the cockpit's, and the loopback listener of
// `aura mcp login`.

import { relay, resolveTarget as resolveAny } from "../../lib/relay.js";

export const CALLBACK_PATHS = ["/api/governance/mcp/authorization/callback", "/aura/mcp/oauth/callback"];

export function resolveTarget(search) {
  return resolveAny(search, CALLBACK_PATHS);
}

relay(CALLBACK_PATHS);
