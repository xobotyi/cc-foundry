# nginx, Nginx Proxy Manager, HAProxy

What an nginx proxy block does once loaded, the places Nginx Proxy Manager's generated config differs from a
hand-written one, and where HAProxy diverges.

## nginx

- **`proxy_pass` with a URI replaces the part of the request URI that matched the `location`; without a URI the original
  URI passes unchanged.** `location /name/ { proxy_pass http://backend/remote/; }` turns `/name/x` into `/remote/x`.
  Inside a regex location or a named location, or after `rewrite ... break`, the directive's URI is ignored. With a
  variable in `proxy_pass`, a URI in the directive replaces the whole request URI instead.
- **A `proxy_set_header` at any level discards every inherited one.** The directives are inherited from the level above
  only when the current level defines none, so adding one header in a `location` drops the `Host`, `X-Real-IP`, and
  `Upgrade` headers set in the `server` block.
- **The defaults sent to the backend are `Host: $proxy_host` and `Connection: close`**, where `$proxy_host` is the
  address from `proxy_pass`, not the client's `Host`. `proxy_http_version` defaults to 1.1 from nginx 1.29.7 and to 1.0
  before; the explicit line every WebSocket recipe carries is needed on the older line.
- **`client_max_body_size` defaults to `1m`** and the resulting 413 is one browsers cannot display. `proxy_buffering` is
  on by default, so server-sent events and long polls arrive in bursts.
- **`set_real_ip_from` has no default and `real_ip_recursive` is off**, so the realip module replaces nothing until a
  trusted range is named, and with recursion off the last address in the chain wins.
- **A literal upstream hostname is resolved once at start.** `server ... resolve` re-resolves at the record's TTL and is
  in open-source nginx from 1.27.3; before that it was commercial-only, and the open-source route was a variable in
  `proxy_pass` plus a `resolver` directive. A container whose address changed keeps receiving nothing until reload.
- **With no `default_server`, the first `server` block declared for the address and port is the default**, so an
  unmatched `Host` lands on whatever include order placed first.
- **`nginx -t` is syntax plus opening referenced files; `nginx -T` also dumps the merged configuration**, which is the
  only way to see which inherited array directives survived.

## Nginx Proxy Manager

- **A fresh v2.15.1 install creates the historical `admin@example.com` / `changeme` account only when
  `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` are set and no active user exists**; otherwise the frontend shows a
  setup wizard and automation logging in with the old default fails.
- **The "Custom Nginx Configuration" boxes are include files at fixed insertion points**, not overrides, so a directive
  placed in the wrong box applies at the wrong scope or not at all.
- **The WebSocket toggle emits `proxy_http_version 1.1` plus the `Upgrade` and `Connection` headers after the custom
  snippet**, so a custom `proxy_set_header` written earlier in the same location is discarded by the inheritance rule
  above.
- **Two certbot DNS plugins in one instance can conflict**; the project's own page warns of Python dependency conflicts
  between plugins.

## HAProxy

- **`option forwardfor` appends `X-Forwarded-For` and never strips a client-supplied one**; the manual says the server
  must read the last occurrence only. `if-none` leaves a client-supplied header alone entirely and is documented for
  trusted environments only.
- **A `server` with no `check` is always considered available**; a dead backend keeps receiving traffic.
- **`http-request` rules run in order and a final action such as `allow` stops the rest of the set.**
- **`http-request set-header` removes the existing header first; `add-header` leaves the client's beside it.**
- **HAProxy publishes a branch table, not a single release.** LTS branches carry multi-year support dates on the
  project's home page; `api.github.com/repos/haproxy/haproxy/releases/latest` returns nothing usable.
