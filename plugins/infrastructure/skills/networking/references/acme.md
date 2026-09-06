# ACME as Written in Configuration

What the challenge, wildcard, propagation, profile, and storage settings in a proxy or client configuration decide. The
certificate lifetime schedule, the Let's Encrypt profiles and rate-limit numbers, and the end of OCSP and expiry mail
are in the devops skill's `references/secrets.md`; this file carries what the client config does.

## Challenges

- **HTTP-01 is port 80 only, and the validator follows redirects up to ten deep, only to `http:` or `https:`, and only
  to ports 80 or 443.** A redirect to 8443 fails with a generic connection error. TLS-ALPN-01 is port 443 only.
- **Validation prefers the AAAA record and retries IPv4 only on a connection timeout**, not on any other error. A stale
  AAAA whose host refuses the connection fails validation although the A record is right. The retry applies to the first
  request only; after a redirect there is none.
- **A wildcard needs DNS-01**, covers one label, and does not cover the bare domain: `*.example.com` and `example.com`
  are separate names and the apex must be listed as a SAN. The failure surfaces in the browser, not at issuance.
- **Propagation waits default near zero across the tools**: Caddy `propagation_delay` 0 with a 2-minute timeout, Traefik
  `propagation.delayBeforeChecks` 0s, certbot's Cloudflare plugin 10 seconds, lego a fixed `--dns.propagation-wait`. An
  intermittent DNS-01 failure on a slow provider reads like a provider outage. In Caddy the DNS challenge disables the
  other challenges by default.
- **Rate limits are token buckets that refill, not weekly windows**, so waiting for a boundary changes nothing; a client
  that retries through a 429 prolongs the limit (Traefik issue 11912). Caddy switches to the staging endpoint during its
  own backoff, so a certificate obtained mid-retry may be a staging one. Staging has higher limits, not no limits.

## Profiles and renewal

- **Profile selection is per client**: Caddy `profile` on the ACME issuer (marked experimental), Traefik
  `certificatesResolvers.<name>.acme.profile`, certbot `--preferred-profile` and `--required-profile` from 4.0 and
  persisted into the renewal config, lego `--profile`, acme.sh `--certificate-profile`. A client without profile support
  cannot obtain a short-lived or IP certificate and does not fall back. The `tlsclient` profile was discontinued
  2026-07-08 and a client pinned to it fails order creation.
- **An IP-address certificate takes the `shortlived` profile and HTTP-01 or TLS-ALPN-01 only**; a DNS-01-only
  configuration cannot obtain one.
- **ARI (RFC 9773) overrides the client's own renewal window** in Caddy from 2.8, certbot from 4.0, acme.sh, and lego; a
  certificate renews earlier than `renewal_window_ratio` or `renew_before_expiry` says, with no error. certbot skips the
  ARI check under `--dry-run`, so a passing dry run says nothing about ARI-driven timing.
- **Traefik computes renewal from `acme.certificatesDuration` (default 2160 hours)**, never from the certificate's
  expiry; see the traefik reference.

## Storage

- **certbot's `/etc/letsencrypt/live/<name>/` holds symlinks into `archive/`**, refreshed on renewal; replacing a
  symlink with a real file makes `live/` diverge from what the next renewal deploys, and the documentation says to point
  the server at those paths rather than copy.
- **Traefik's `acme.json` must be mode 600** or the resolver is skipped with a log line ("permissions 660 ... are too
  open"); a persistent volume that does not preserve the mode produces this on every start.
- **lego v5 changed its storage layout and needs `lego migrate`** before any other command; without it the upgrade looks
  like a fresh unregistered install.
- **acme.sh separates `--home` from `--config-home`**, and the cron entry embeds whichever was used at install.
- **ZeroSSL's free ACME endpoint requires External Account Binding credentials**; a client without EAB gets an
  EAB-required error, not a generic authentication failure. From Caddy 2.8 ZeroSSL is only added as an issuer when
  `email` is set.

## HSTS

- **Removal from the HSTS preload list takes 6 to 12 weeks to reach most Chrome users and longer elsewhere**, and
  requires the site to serve valid HTTPS with an HSTS header lacking `preload`; a site that has already broken cannot
  start the removal.
