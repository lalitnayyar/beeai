# BeeAI Customer Support Demo (Node.js + Local DB + Helpdesk)

This is an interactive local application that demonstrates how BeeAI-style multi-agent workflows can support enterprise customer support operations.

## What it demonstrates

- Ticket triage agent (category, urgency, routing).
- Response drafting agent (brand-aware personalized draft).
- Escalation routing agent (specialist queue assignment).
- Proactive support agent (churn/sentiment risk outreach).
- Lightweight built-in helpdesk chat (end customer + sample support agent).
- Role-based views (`operator` and `admin`) for workflow operations and oversight.
- OpenTelemetry SDK traces and Prometheus metrics export.

## Run locally

```bash
npm install
npm start
```

Open: [http://localhost:3000](http://localhost:3000)

OpenTelemetry metrics: [http://localhost:9464/metrics](http://localhost:9464/metrics)

## One-command Docker deployment

```bash
docker compose up --build
```

App: [http://localhost:3000](http://localhost:3000)  
Metrics: [http://localhost:9464/metrics](http://localhost:9464/metrics)

### Three interfaces from one Docker container

- BeeAI interactive console: [http://localhost:3000/beeai](http://localhost:3000/beeai)
- Helpdesk portal: [http://localhost:3000/helpdesk?role=operator](http://localhost:3000/helpdesk?role=operator)
- Customer chat portal: [http://localhost:3000/customer](http://localhost:3000/customer)

### Start/stop scripts

```bash
./scripts/start.sh
./scripts/stop.sh
```

## API endpoints

- `GET /api/tickets` - returns all generated tickets.
- `GET /api/telemetry` - returns workflow telemetry events.
- `GET /api/chat` - returns local helpdesk chat messages.

## Data storage

All data is stored locally in `data/db.json` via `lowdb` and can be persisted with Docker bind mounts.

## Disclaimer

This project is created by **Lalit Nayyar** (`lalitnayyar@gmail.com`) strictly for educational and learning purposes to explore BeeAI multi-agent customer support workflows. It is a demonstration prototype and not intended as production-grade support software.

## Documentation

- User and administration guide: `USER.md`
