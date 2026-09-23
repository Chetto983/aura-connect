# aura-connect

The one Google OAuth redirect URI every [Aura](https://github.com/chetto1983/Aura) install shares:

```
https://chetto1983.github.io/aura-connect/google/callback/
```

Register exactly that string (trailing slash included) as an **Authorized redirect URI** in
your own Google Cloud OAuth client of type **Web application**. It is the same for every
install and never changes, so it works whether Aura is reached by a LAN address, a tunnel,
or a public hostname — Google only ever sees this URI.

## How it works

1. Aura starts the consent with `redirect_uri` set to the URI above and a `state` of the form
   `<nonce>.<base64url(install callback URL)>`, where the callback URL is the install's own
   `https://<host>/admin/auth/google/callback`.
2. After consent, Google sends the browser here. [`relay.js`](google/callback/relay.js) decodes
   the callback URL from `state` and forwards the browser to it with Google's query string
   untouched (`code`, `state`, `scope`, or `error`).
3. The install checks that `state` is the one it issued, then exchanges the code with its own
   client secret, sending this same URI as `redirect_uri`.

## Security properties

- **No general open redirect.** The only reachable destination is the exact path
  `/admin/auth/google/callback`: `https` on any host, plain `http` only on loopback, and never
  with credentials, a query or a fragment. Anything else gets an error page and no redirect.
- **The code is useless here.** Exchanging it needs the install's own client secret, which
  never leaves the install. A tampered `state` is refused by the install, which only accepts
  the exact value it issued.
- **Nothing leaks from the page.** No analytics, no third-party resources, a CSP that only
  allows this page's own script, and `no-referrer` so the code never reaches another site in
  a `Referer` header.
- **Hosting logs.** Like any redirect URI, the request (and so the single-use, short-lived
  code) passes through GitHub Pages' infrastructure. It cannot be redeemed without the
  install's client secret.

## Development

```
node --test
```

The tests in [`test/relay.test.mjs`](test/relay.test.mjs) run in CI on every push.
