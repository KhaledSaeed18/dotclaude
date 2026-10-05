# Traefik behind Coolify: what to know before relying on it

Coolify runs Traefik as `coolify-proxy` and writes routers from container labels. These behaviours affect every app and are easy to misread.

## Certificates

- Let's Encrypt uses the HTTP-01 challenge. Issuance needs the domain's DNS to point at the server **before** the router is registered. A router created while the name does not resolve fails once (`NXDOMAIN` in the proxy log) and the app serves Traefik's self-signed default until a redeploy re-registers it.
- `openssl s_client -connect 127.0.0.1:443 -servername <domain>` from the server shows which certificate is served. `CN = TRAEFIK DEFAULT CERT` means no certificate was issued yet. Add `-verify_hostname <domain> -verify_return_error` and look for `Verify return code: 0` to prove a real one.
- Proxy log: `sudo docker logs coolify-proxy --since 1h 2>&1 | grep -i acme`.

## Forwarded headers

- With no `forwardedHeaders.trustedIPs` or `forwardedHeaders.insecure` on the entrypoint, Traefik drops any `X-Forwarded-*` header a client sends and writes `X-Forwarded-For` itself with the peer address. The last (and only) entry is therefore the real client.
- A Node server behind it does not append to the header. The `proxy-client-address` skill builds on this.
- Confirm the args rather than assuming: `sudo docker inspect coolify-proxy --format '{{json .Args}}' | tr ',' '\n' | grep -i forwarded` should print nothing.

## Rolling updates

- Coolify starts the new container beside the old one, waits for the container's own health check, then stops the old one. Traefik routes to every running container that carries the router labels and is healthy or has no health check.
- During the stop, Traefik keeps the old container as a backend until Docker reports it gone. A process that stays alive after SIGTERM (waiting for a long-lived stream) keeps receiving every other request and answers nothing: alternating 502s for the whole grace period. Exit within a second on SIGTERM; the `nextjs-coolify-image` skill shows how.
- No retry middleware is configured by default, so a refused connection is a 502 to the client.

## Finding containers

Containers are named after resource UUIDs. Find an app's container by label, never by name:

```bash
sudo docker ps --filter label=coolify.resourceName=<app-name> --format '{{.Names}} {{.Status}}'
```

## Reading a deployment

The deployment log lives in Coolify's database, not in Docker:

```bash
sudo docker exec coolify-db psql -U coolify -d coolify -At -c \
  "select created_at, status, logs from application_deployment_queues
   where application_id::text = (select id::text from applications where uuid='<app-uuid>')
   order by id desc limit 1"
```

`logs` is a JSON array of `{timestamp, output}` entries; the lines `New container started`, `New container is healthy`, `Removing old containers` and `Rolling update completed` bracket the switch.
