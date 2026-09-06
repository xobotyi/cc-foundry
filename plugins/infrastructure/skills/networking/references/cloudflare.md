# Cloudflare in the Path

What Cloudflare does to the traffic between the edge and the origin, and what a `cloudflared` tunnel configuration does
once loaded.

## Headers and origin trust

- **Cloudflare appends to a client-supplied `X-Forwarded-For` rather than replacing it.** If none is present it sets the
  header to the connecting address; if one is present it appends, leaving the client's value leftmost. Any origin
  reading the first value trusts a value the client chose. `CF-Connecting-IP` carries exactly one address and is the
  header to read; `True-Client-IP` is Enterprise-only and spoofable unless Cloudflare itself adds it. Request headers
  whose names contain a `.` are dropped at the edge.
- **Encryption mode `Full` does not validate the origin certificate in any way**: expired, self-signed, or a wrong name
  all pass, and the page says a malicious party could present its own. `Full (strict)` requires a valid certificate from
  a public CA or Cloudflare Origin CA with a matching name. The mode is managed by Cloudflare by default (Automatic
  SSL/TLS), which ramps a change from 1 percent of traffic and never moves to a less secure mode; opting out means
  setting the zone to Custom.
- **Global Authenticated Origin Pulls proves a request came from the Cloudflare network, not from your account**; the
  certificate is shared across every customer. Zone-level and per-hostname pulls use a certificate you upload. The three
  levels are independent switches, and none applies to a hostname served through a Tunnel, since a tunnel has no inbound
  listener to present a client certificate to.
- **A tunnel removes the need for an inbound port; it does not make a host with a public address unreachable.** The
  origin firewall must block inbound regardless, and historical DNS records keep the old address public. Cloudflare
  Access tells the origin to validate the `Cf-Access-Jwt-Assertion` header with the team's public key, because the
  cookie is not guaranteed to be passed and a directly reachable origin bypasses Access otherwise. The signing keys
  rotate every six weeks and the previous key stays valid seven days, so a cached key stops verifying valid tokens a
  week after a rotation.

## cloudflared

- **A dashboard-managed tunnel ignores the local `config.yml` ingress block.** The orchestrator starts at version -1 so
  that the first remote configuration overrides whatever the file supplied; the tunnel is healthy and the local rules
  never match.
- **Ingress rules are evaluated top to bottom, and the last rule must be a catch-all with no hostname or path**, or
  `cloudflared` refuses to start with that exact error. `cloudflared tunnel ingress validate` checks the file without
  starting the tunnel; `cloudflared tunnel ingress rule <URL>` reports which rule a URL hits.
- **Only HTTP and HTTPS are reachable from a plain browser through a public hostname.** TCP, SSH, RDP, and SMB are
  carried over WebSocket and need `cloudflared access` or the WARP client on the client side; private network routes are
  reachable only through WARP.
- **Origin parameters that default the wrong way for a self-signed origin**: `noTLSVerify` defaults to `false` and
  setting it `true` accepts any origin certificate; `originServerName` defaults to the service URL's hostname, so an
  origin certificate issued to another name fails until it is set; `httpHostHeader` defaults to empty, so the origin
  receives the public hostname as `Host`, which breaks a virtual-host origin expecting its internal name.
- **`cert.pem` is an account-wide API token that can create, delete, and manage every tunnel**; the `<UUID>.json`
  credentials file runs one tunnel and nothing else. The token was written to logs in cleartext before 2022.4.0.
- **Removed and flipped over the CalVer line**: `proxy-dns`, every `--proxy-dns*` flag, and the `resolver:` section were
  removed in 2026.2.0, so a config carrying them is rejected; `--edge-ip-version` flipped from `4` to `auto` in 2026.4.0
  while the run-parameters page dated 2026-04-17 says `4`, so an IPv4-only egress rule stops matching after the upgrade;
  a tunnel with no ingress rules returns 503 for everything since 2023.3.1 instead of falling back to `localhost:8080`;
  the `warp-routing: enabled:` flag has been ignored since 2023.9.0, so a flag intended to block private routing does
  nothing. A forced `--protocol quic` on a network that blocks UDP fails outright instead of falling back to HTTP/2;
  `auto` does the fallback.
- **Error 1033 and a 502 point at opposite halves of the path**: 1033 means Cloudflare found no healthy connector, 502
  means the connector is up and cannot reach the origin named in the ingress rule.
- **The video and large-file restriction lives in the Service-Specific Terms as a CDN clause**, not in the Terms of
  Service, and does not apply to private network routes. A public hostname serving video on a free plan can be limited,
  with an email notice.
