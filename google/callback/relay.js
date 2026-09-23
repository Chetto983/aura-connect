// Google redirects every Aura install's OAuth consent here: one fixed redirect URI that
// never depends on the install's host, so a LAN IP or a changing tunnel still works.
// The install puts its own callback URL in `state`; this page forwards the browser there
// with Google's query string untouched. The install, not this page, validates `state`
// against the value it issued, so a forged state is refused where the secret lives.

export const CALLBACK_PATH = "/admin/auth/google/callback";

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function decodeBase64Url(value) {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
}

// resolveTarget returns the URL to forward to, or null when the state does not name an
// Aura callback. Only the exact callback path is reachable: this page must never become
// a general-purpose open redirect.
export function resolveTarget(search) {
  const state = new URLSearchParams(search).get("state") ?? "";
  const dot = state.indexOf(".");
  if (dot <= 0) return null;

  let target;
  try {
    target = new URL(decodeBase64Url(state.slice(dot + 1)));
  } catch {
    return null;
  }

  const transportOk =
    target.protocol === "https:" ||
    (target.protocol === "http:" && LOOPBACK_HOSTS.has(target.hostname));
  if (
    !transportOk ||
    target.username !== "" ||
    target.password !== "" ||
    target.search !== "" ||
    target.hash !== "" ||
    target.pathname !== CALLBACK_PATH
  ) {
    return null;
  }
  return target.origin + CALLBACK_PATH + search;
}

if (typeof window !== "undefined") {
  const target = resolveTarget(window.location.search);
  if (target !== null) {
    window.location.replace(target);
  } else {
    document.getElementById("pending").hidden = true;
    document.getElementById("refused").hidden = false;
  }
}
