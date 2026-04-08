# BeeAI Support Demo - Project Plan

## 1) Project Purpose

Build an interactive, local-first demonstration platform that shows how BeeAI-style multi-agent workflows can be used in customer support operations across ticket handling and live chat routing.

This project is designed to:

- Demonstrate practical BeeAI concepts in a realistic support scenario.
- Visualize collaboration between support workflows and human agents.
- Provide a single deployable environment for learning, testing, and showcasing.
- Stay lightweight and self-contained for educational usage.

## 2) Problem Statement

Support teams need to handle high ticket volume, prioritize urgent cases, draft quality responses, and route chats/tickets to available staff. The project solves this by combining:

- AI-style workflow automation for triage and response support.
- Human-in-the-loop controls for acceptance/rejection of live chats.
- Operational visibility through admin/observe panes and telemetry.

## 3) Target Outcomes (What to Achieve)

### Primary Outcomes

1. Show end-to-end customer support lifecycle in one app:
   - Customer message -> agent assignment -> chat acceptance -> response flow.
2. Demonstrate BeeAI workflow reasoning:
   - Triage, drafting, escalation, proactive support.
3. Provide clear operational visualization for both operator and admin users.
4. Enable one-command startup in a local/dev environment.

### Success Criteria

- Three interfaces run from one deployment:
  - `/beeai`
  - `/helpdesk`
  - `/customer`
- Customer and helpdesk chat behavior is near real-time.
- Agent routing and assignment actions are observable and testable.
- Workflow and chat telemetry are exported and visible.

## 4) Current Functional Scope (As Implemented)

## 4.1 Frontends

### A) BeeAI Interactive Portal (`/beeai`)
- Two-pane layout:
  - Left: Admin Pane (workflow trigger controls)
  - Right: Observe Pane (workflow outputs + events + recent tickets)
- Draggable splitter with:
  - Drag-to-resize
  - Double-click reset to 50/50
  - Layout preference persisted in browser

### B) Helpdesk Portal (`/helpdesk`)
- Two-pane layout:
  - Left: Operator Pane
  - Right: Admin Pane
- Agent login simulation (`agent1`, `agent2`, `agent3`)
- Agent state controls:
  - `online`
  - `busy`
  - `offline`
- Pending assignment popup with:
  - Accept
  - Reject (auto-reroute to another available online agent)
- Live inbox updates via polling

### C) Customer Chat Portal (`/customer`)
- Customer can select organization and send messages.
- Shows assignment/waiting status:
  - Waiting for agent accept
  - Assigned agent
  - Re-routing status
- Live conversation updates via polling

## 4.2 Workflow Intelligence (BeeAI Demo Logic)

Implemented agents:

1. **Ticket Triage Agent**
   - Detects category and urgency
   - Determines routing path
2. **Response Drafting Agent**
   - Drafts tone-aware response content
3. **Escalation Routing Agent**
   - Selects queue and ownership
4. **Proactive Support Agent**
   - Uses customer signals (risk/csat/volume)

## 4.3 Live Chat Routing and Assignment

- Customer messages create/continue conversation threads.
- Router assigns conversations to available online agents.
- Assignment lifecycle:
  - `pending` -> `accepted` or `rejected`
- Reject flow:
  - Attempts reroute to other online agents
  - Falls back to queued/waiting system message if unavailable

## 4.4 Observability

- OpenTelemetry spans for workflow and agent steps.
- Prometheus metrics endpoint (`/metrics` on port `9464`).
- In-app telemetry event stream for workflow/chat actions.

## 4.5 Data and Deployment

- Local JSON database via `lowdb` (`data/db.json`).
- Dockerized single-container deployment via Compose.
- Helper scripts:
  - `./scripts/start.sh`
  - `./scripts/stop.sh`

## 5) Architecture Summary

### Backend
- Node.js + Express
- EJS server-rendered pages
- Shared API + page-render routes

### Persistence
- `lowdb` file-backed storage for:
  - customers
  - tickets
  - chat messages
  - helpdesk agents/states
  - conversation assignments
  - telemetry events

### Frontend Runtime
- Minimal JS modules for:
  - live chat polling
  - agent action controls
  - splitter behavior

## 6) Key User Journeys

### Journey 1: Customer -> Agent Conversation
1. Customer sends message on `/customer`.
2. System routes chat to available agent.
3. Customer sees waiting status.
4. Agent sees pending popup in `/helpdesk`.
5. Agent accepts and begins active chat.

### Journey 2: Agent Reject and Reroute
1. Agent receives pending chat request.
2. Agent clicks Reject.
3. Router sends chat to another online agent.
4. Customer sees rerouting status update.

### Journey 3: BeeAI Workflow Demonstration
1. Admin creates ticket in `/beeai`.
2. Observe pane displays all agent outputs.
3. Telemetry and ticket history update for review.

## 7) Gaps and Improvement Roadmap

## Phase 1 - Reliability and UX Hardening
- Move from polling to WebSocket/SSE for truly instant updates.
- Add server-side validation for all chat/ticket payloads.
- Add optimistic UI states and retry/error notifications.
- Improve message ordering and deduping safeguards.

## Phase 2 - Security and Access Control
- Introduce real authentication for customer/operator/admin roles.
- Add session management and permission checks.
- Add audit logs for assignment accept/reject actions.

## Phase 3 - Production Readiness
- Replace `lowdb` with PostgreSQL or similar persistent DB.
- Add background job handling for assignment timeout auto-reroute.
- Add health checks and structured logs.
- Add test suite (unit + integration + UI smoke tests).

## Phase 4 - Integration Expansion
- Connect to real CRM/helpdesk systems (Salesforce/Zendesk/etc.).
- Plug real knowledge base retrieval for drafting.
- Add external notification channels (email/Slack/webhooks).

## 8) Testing and Validation Plan

### Functional
- Verify all three portals load and interact correctly.
- Verify pending/accept/reject routing scenarios.
- Verify state transitions: online/busy/offline.
- Verify splitter behavior and persistence.

### Observability
- Confirm metrics endpoint availability.
- Confirm trace events and in-app telemetry records.

### Deployment
- Validate start/stop scripts on environments with:
  - `docker compose`
  - `docker-compose`

## 9) Documentation Plan

Current docs:
- `README.md`: quick start + deployment + endpoints
- `USER.md`: operator/admin/customer step-by-step usage

Recommended additions:
- `ARCHITECTURE.md`: component and data-flow diagrams
- `API.md`: request/response specs and examples
- `OPERATIONS.md`: monitoring and troubleshooting playbook

## 10) Final Goal Statement

Deliver a complete, visual, and interactive BeeAI educational support platform where users can observe:

- how AI-assisted support workflows are executed,
- how human agents and routing states affect customer chat outcomes,
- and how operational telemetry supports decision-making.

This project should remain easy to run locally while evolving toward production-like reliability and integrations.
