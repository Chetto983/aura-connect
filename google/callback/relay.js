// Google redirects every Aura install's calendar/email consent here. The install's own
// callback is the PIM sidecar route Aura serves on every origin.

import { relay, resolveTarget as resolveAny } from "../../lib/relay.js";

export const CALLBACK_PATH = "/admin/auth/google/callback";

export function resolveTarget(search) {
  return resolveAny(search, [CALLBACK_PATH]);
}

relay([CALLBACK_PATH]);
