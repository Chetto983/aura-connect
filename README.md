# aura-connect

Fixed OAuth addresses every [Aura](https://github.com/chetto1983/Aura) install shares, so an
install reached by a LAN address or a changing tunnel can still sign in.

- [Google](#google): the redirect URI for calendar and email accounts.
- [MCP](#mcp): Aura's Client ID Metadata Document and its redirect relay, for remote MCP
  servers that accept no other kind of client registration.

## Google

The one Google OAuth redirect URI every Aura install shares:

```
https://chetto1983.github.io/aura-connect/google/callback/
```

Register exactly that string (trailing slash included) as an **Authorized redirect URI** in
your own Google Cloud OAuth client of type **Web application**. It is the same for every
install and never changes, so it works whether Aura is reached by a LAN address, a tunnel,
or a public hostname — Google only ever sees this URI.

### How it works

1. Aura starts the consent with `redirect_uri` set to the URI above and a `state` of the form
   `<nonce>.<base64url(install callback URL)>`, where the callback URL is the install's own
   `https://<host>/admin/auth/google/callback`.
2. After consent, Google sends the browser here. [`relay.js`](google/callback/relay.js) decodes
   the callback URL from `state` and forwards the browser to it with Google's query string
   untouched (`code`, `state`, `scope`, or `error`).
3. The install checks that `state` is the one it issued, then exchanges the code with its own
   client secret, sending this same URI as `redirect_uri`.

## MCP

Some remote MCP servers (ElevenLabs, for one) publish no client registration endpoint and
accept only [Client ID Metadata Documents](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00):
the client identifies itself with the HTTPS URL of a JSON document describing it. Aura's is

```
https://chetto1983.github.io/aura-connect/mcp/client-metadata.json
```

and its only redirect URI is the relay page next to it,
`https://chetto1983.github.io/aura-connect/mcp/callback/`. The authorization server must match a
redirect URI exactly, and an install's own cockpit address is neither known in advance nor, on
a LAN, `https` — so the relay is what makes one document serve every install. It works like
the Google relay, with the MCP SDK's `state` as the nonce, and forwards only to the cockpit's
`/api/governance/mcp/authorization/callback` or to the loopback listener of `aura mcp login` at
`/aura/mcp/oauth/callback`.

Aura is a public client: the document carries no secret, and the token exchange is protected by
PKCE, so a code forwarded by the relay is worthless without the verifier held by the install
that started the consent.

## Security properties

- **No general open redirect.** Each relay reaches only its exact Aura callback paths: `https`
  on any host, plain `http` only on loopback, and never with credentials, a query or a
  fragment. Anything else gets an error page and no redirect.
- **The code is useless here.** Exchanging a Google code needs the install's own client
  secret, and an MCP code needs the install's PKCE verifier; neither leaves the install. A tampered `state` is refused by the install, which only accepts
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
