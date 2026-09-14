# Jobfinden voice backend

This small Cloudflare Worker keeps `OPENAI_API_KEY` on the server and creates short-lived Realtime client secrets for the GitHub Pages portal. The browser never receives the long-lived API key. It has no runtime dependency.

## Deploy

1. Log in to Cloudflare with Wrangler or use the Workers dashboard.
2. From this folder, run `npx wrangler secret put OPENAI_API_KEY` and enter the key in the secure prompt. Do not commit it and do not paste it into the portal.
3. Deploy with `npx wrangler deploy`.
4. Set the deployed Worker URL in the portal's `jobfinden-voice-backend` meta tag, then redeploy the static portal.

## Endpoints

- `GET /health` checks that the service is reachable.
- `POST /realtime/session` accepts the current German question and returns an ephemeral Realtime client secret from OpenAI.

The endpoint intentionally returns an error until `OPENAI_API_KEY` exists as a Worker secret.
