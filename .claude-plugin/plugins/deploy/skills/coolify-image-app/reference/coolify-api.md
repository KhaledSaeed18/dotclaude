# Coolify API for a Docker Image application

Base URL is the Coolify instance (`https://coolify.example.com`); every call carries `Authorization: Bearer <token>`.

## Token scopes

| Scope | Needed for |
| --- | --- |
| `write` | `PATCH /api/v1/applications/{uuid}` to change `docker_registry_image_tag` |
| `deploy` | `POST /api/v1/deploy?uuid={uuid}&force=false` |
| `read` | `GET /api/v1/deployments/{deployment_uuid}` to poll `.status` |

`root` and `read:sensitive` are never needed by a pipeline. One token per repository, named after it, so revoking one does not stop the others.

## The three calls a deploy makes

```bash
# 1. Point the application at the immutable tag the pipeline just pushed
curl --fail-with-body -sS -X PATCH "$COOLIFY_URL/api/v1/applications/$APP_UUID" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" -H 'Content-Type: application/json' \
  -d "$(jq -n --arg tag "sha-abcdef123456" '{docker_registry_image_tag: $tag}')"

# 2. Start a deployment; the response carries deployments[0].deployment_uuid
curl --fail-with-body -sS -X POST "$COOLIFY_URL/api/v1/deploy?uuid=$APP_UUID&force=false" \
  -H "Authorization: Bearer $COOLIFY_TOKEN"

# 3. Poll until finished, failed or cancelled
curl --fail-with-body -sS "$COOLIFY_URL/api/v1/deployments/$DEPLOYMENT_UUID" \
  -H "Authorization: Bearer $COOLIFY_TOKEN" | jq -r .status
```

`POST` only for `deploy`; a `GET` is rejected. `force=false` keeps the image cache. A missing `deployment_uuid` in the response means nothing was queued (wrong UUID, app stopped, or a deploy already running): fail fast rather than polling.

## Field notes for the UI

- **Image name and tag** are separate fields; the pipeline overwrites only the tag.
- **Domains** accepts a comma-separated list; keep exactly one `https://` entry. Changing the domain writes new proxy labels only on the next deploy or restart.
- **Health check** of type container command runs `docker exec` inside the container; the command runs with the image's `USER`. Timing fields are seconds.
- **Resource limits** accept Docker syntax (`512m`, `1g`). An empty or `0` value means unlimited.
- **Environment variables** are injected at container start. A variable the app only reads at build time (anything inlined into a client bundle) has no effect here.
- **Persistent storage** is only needed for files the app writes and must keep; a stateless web app needs none.

## Finding things on the server

```bash
sudo docker ps --filter label=coolify.resourceName=<app> --format '{{.Names}} {{.Status}}'
sudo docker exec coolify-db psql -U coolify -d coolify -At -c \
  "select uuid, name, fqdn, docker_registry_image_tag from applications"
```
