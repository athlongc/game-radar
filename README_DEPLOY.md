# Game Radar Deployment

This project is a small Node.js web service that serves the dashboard and the `/api/metrics` endpoint.

## Render

Recommended settings:

- Service type: Web Service
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Node version: `22.13.0`

The included Blueprint sets `HOST=0.0.0.0` for Render. Local runs still default to `127.0.0.1`.

On non-local hosts, both the browser and API are restricted to the public `heartopia` dashboard. Localhost continues to expose every dashboard.

`render.yaml` is included, so Render can also create the service from a Blueprint.
