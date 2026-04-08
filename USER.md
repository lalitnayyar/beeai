# USER GUIDE - BeeAI Support Demo

This guide explains how administrators, operators, observers, and end users can run and use all three interfaces:

- BeeAI Interactive Console: `http://localhost:3000/beeai`
- Helpdesk Portal: `http://localhost:3000/helpdesk`
- Customer Chat Portal: `http://localhost:3000/customer`

## 1) Prerequisites

- Docker and Docker Compose installed
- Port `3000` and `9464` available

## 2) Start and Stop the Application

### Start (single Docker deployment)

```bash
./scripts/start.sh
```

This starts one container hosting all interfaces and telemetry.

### Stop

```bash
./scripts/stop.sh
```

## 3) System Architecture (What runs where)

- **Single backend app** serves all three frontends.
- **Shared local database** (`data/db.json`) stores tickets, chat messages, telemetry.
- **Shared chat stream** is used by Helpdesk and Customer Portal, so both interfaces see the same conversation feed.
- **Live chat polling** refreshes both portals every 2 seconds for near real-time message exchange.
- **Agent routing** assigns each customer conversation to an available logged-in helpdesk agent (`agent1/agent2/agent3`).
- **Agent states** support `online`, `busy`, and `offline`.
- **Chat handshake** requires agent Accept/Reject for newly routed customer chats.
- **BeeAI module** runs agent workflow processing and shows triage/drafting/escalation/proactive outputs.
- **Helpdesk page is dual-pane**: left = Operator pane, right = Admin pane.
- **BeeAI page is dual-pane**: left = Admin pane, right = Observe pane.

## 4) Admin Guide (Step-by-step)

1. Open `http://localhost:3000/helpdesk`
2. On the **right Admin Pane**, verify latest tickets and telemetry stream are visible.
3. Open `http://localhost:9464/metrics` and confirm metrics endpoint responds.
4. Ask operator (or use left pane) to create a test ticket from Helpdesk:
   - Choose customer
   - Enter issue title/details
   - Submit `Create + Run Workflow`
5. Open `http://localhost:3000/beeai` and review:
   - Left: **Admin Pane** (workflow trigger)
   - Right: **Observe Pane** (workflow outcomes)
6. Confirm workflow details on Observe Pane:
   - Ticket Triage Agent output
   - Response Drafting Agent output
   - Escalation Routing Agent output
   - Proactive Support Agent output
7. Validate chat sync:
   - Send message in Helpdesk chat
   - Open Customer Portal and confirm it appears

## 5) Operator Guide (Step-by-step)

1. Open `http://localhost:3000/helpdesk`
2. Use the **left Operator Pane** to:
   - Log in as `agent1`, `agent2`, or `agent3`
   - Set agent state (`Online` / `Busy` / `Offline`)
   - Create ticket
   - Send/receive Helpdesk chat messages
3. When popup shows `Awaiting chat`, choose:
   - `Accept` to take the conversation
   - `Reject` to route chat to another available agent
3. Use the **right Admin Pane** in the same browser to monitor:
   - Ticket list
   - Telemetry stream
4. If needed, open `http://localhost:3000/beeai` to inspect processing details in Observe Pane.

## 6) End Customer Guide (Step-by-step)

1. Open `http://localhost:3000/customer`
2. Select customer organization
3. Enter your name and message
4. Submit message
5. Review conversation feed:
   - Customer messages are shown
   - Agent replies appear through shared helpdesk workflow

## 7) BeeAI Interactive Workflow Guide

1. Open `http://localhost:3000/beeai`
2. In the **left Admin Pane**, create a support ticket
3. In the **right Observe Pane**, check `Latest Workflow Result` cards:
   - Triage (`category`, `urgency`, `route`)
   - Drafting (response tone + draft)
   - Escalation (queue decision)
   - Proactive support action
4. In the same Observe Pane, check:
   - Recent tickets
   - OpenTelemetry event list

## 8) Validation Checklist

- [ ] All three pages load: `/beeai`, `/helpdesk`, `/customer`
- [ ] Helpdesk shows two panes in one browser (Operator left, Admin right)
- [ ] BeeAI shows two panes in one browser (Admin left, Observe right)
- [ ] Helpdesk and Customer Portal show synchronized messages
- [ ] Ticket creation shows workflow output in BeeAI
- [ ] Metrics endpoint works: `/metrics`
- [ ] Start/stop scripts work without manual docker commands

## 9) Troubleshooting

- If app does not start:
  - Run `docker compose down`
  - Re-run `./scripts/start.sh`
- If ports are busy:
  - Free ports `3000` and `9464`, then start again
- If data seems stale:
  - Stop app and inspect/reset `data/db.json` (local demo data)

## 10) Disclaimer

Created by **Lalit Nayyar** (`lalitnayyar@gmail.com`) for educational learning and experimentation with BeeAI multi-agent workflows. This is a demo prototype, not production support software.
