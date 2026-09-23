// Every relay page here receives an authorization server's redirect for ANY Aura install:
// one fixed redirect URI that never depends on the install's host, so a LAN IP or a
// changing tunnel still works. The install puts its own callback URL in `state` as
// `<nonce>.<base64url(callback URL)>`; the page forwards the browser there with the query
// string untouched. The install, not this page, validates `state` against the value it
// issued, so a forged state is refused where the secret lives.

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function decodeBase64Url(value) {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"));
}

// resolveTarget returns the URL to forward to, or null when the state does not name one of
// callbackPaths. Only those exact paths are reachable: a relay must never become a
// general-purpose open redirect.
export function resolveTarget(search, callbackPaths) {
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
    !callbackPaths.includes(target.pathname)
  ) {
    return null;
  }
  return target.origin + target.pathname + search;
}

// relay forwards the browser, or shows the refusal. A no-op outside a browser so the
// page modules can be imported by the tests.
export function relay(callbackPaths) {
  if (typeof window === "undefined") return;
  const target = resolveTarget(window.location.search, callbackPaths);
  if (target !== null) {
    window.location.replace(target);
    return;
  }
  document.getElementById("pending").hidden = true;
  document.getElementById("refused").hidden = false;
}
