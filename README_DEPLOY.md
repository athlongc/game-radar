# Game Radar Deployment

This project is a small Node.js web service that serves the dashboard and the `/api/metrics` endpoint.

## Render

Recommended settings:

- Service type: Web Service
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/health`
- Node version: `20`

`render.yaml` is included, so Render can also create the service from a Blueprint.

