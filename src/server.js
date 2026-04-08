import express from "express";
import { v4 as uuidv4 } from "uuid";
import { metrics, trace } from "@opentelemetry/api";
import { createDb } from "./db.js";
import { createWorkflowResult } from "./workflow.js";

const app = express();
const port = process.env.PORT || 3000;
const db = await createDb();
const tracer = trace.getTracer("beeai-support-demo", "1.0.0");
const meter = metrics.getMeter("beeai-support-demo", "1.0.0");
const workflowCounter = meter.createCounter("beeai_workflows_total", {
  description: "Total BeeAI workflows executed",
});
const escalatedCounter = meter.createCounter("beeai_escalations_total", {
  description: "Total tickets escalated to humans",
});
const chatMessageCounter = meter.createCounter("beeai_chat_messages_total", {
  description: "Total chat messages in local helpdesk",
});

function ensureHelpdeskState() {
  if (!Array.isArray(db.data.helpdeskAgents)) {
    db.data.helpdeskAgents = [
      { id: "agent1", name: "Support Agent 1", state: "online" },
      { id: "agent2", name: "Support Agent 2", state: "online" },
      { id: "agent3", name: "Support Agent 3", state: "offline" },
    ];
  }
  db.data.helpdeskAgents = db.data.helpdeskAgents.map((agent) => {
    if (!agent.state) {
      return { ...agent, state: agent.online ? "online" : "offline" };
    }
    return agent;
  });
  if (!db.data.conversationAssignments || typeof db.data.conversationAssignments !== "object") {
    db.data.conversationAssignments = {};
  }
}

function getAgentLoad(agentId) {
  return Object.values(db.data.conversationAssignments).filter((entry) => entry?.agentId === agentId).length;
}

function assignAgentToConversation(conversationId) {
  const existing = db.data.conversationAssignments[conversationId];
  if (existing) {
    const onlineAssigned = db.data.helpdeskAgents.find(
      (agent) => agent.id === existing.agentId && existing.status !== "rejected" && agent.state !== "offline",
    );
    if (onlineAssigned) return onlineAssigned;
  }
  const available = db.data.helpdeskAgents
    .filter((agent) => agent.state === "online")
    .sort((a, b) => getAgentLoad(a.id) - getAgentLoad(b.id));
  if (available.length === 0) return null;
  const selected = available[0];
  db.data.conversationAssignments[conversationId] = {
    agentId: selected.id,
    status: "pending",
    assignedAt: new Date().toISOString(),
  };
  return selected;
}

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

function recordTelemetry(eventName, payload) {
  db.data.telemetry.unshift({
    id: uuidv4(),
    eventName,
    payload,
    timestamp: new Date().toISOString(),
  });
  db.data.telemetry = db.data.telemetry.slice(0, 50);
}

function getRole(req) {
  const role = (req.query.role || req.body?.role || "operator").toString();
  return role === "admin" ? "admin" : "operator";
}

app.get("/", async (_req, res) => {
  return res.redirect("/beeai");
});

app.get("/beeai", async (req, res) => {
  const role = getRole(req);
  await db.read();
  ensureHelpdeskState();
  res.render("beeai", {
    role,
    customers: db.data.customers,
    tickets: db.data.tickets.slice(0, 10),
    telemetry: db.data.telemetry.slice(0, 12),
    integrations: db.data.integrations,
    workflowResult: null,
  });
});

app.get("/helpdesk", async (req, res) => {
  const role = getRole(req);
  await db.read();
  ensureHelpdeskState();
  res.render("helpdesk", {
    role,
    customers: db.data.customers,
    tickets: db.data.tickets.slice(0, 10),
    telemetry: db.data.telemetry.slice(0, 12),
    chatMessages: db.data.chatMessages.slice(-30),
    helpdeskAgents: db.data.helpdeskAgents,
    integrations: db.data.integrations,
  });
});

app.get("/customer", async (_req, res) => {
  await db.read();
  ensureHelpdeskState();
  res.render("customer", {
    customers: db.data.customers,
    chatMessages: db.data.chatMessages.slice(-30),
    helpdeskAgents: db.data.helpdeskAgents,
  });
});

app.post("/tickets", async (req, res) => {
  const role = getRole(req);
  const source = (req.body.source || "beeai").toString();
  const { customerId, title, message } = req.body;
  await db.read();
  const customer = db.data.customers.find((item) => item.id === customerId);

  const workflowResult = tracer.startActiveSpan("beeai.workflow.execute", (span) => {
    span.setAttribute("beeai.customer.id", customerId || "unknown");
    span.setAttribute("beeai.customer.tier", customer?.tier || "unknown");
    span.setAttribute("beeai.ticket.title", title || "untitled");

    const result = createWorkflowResult({
      ticketText: `${title}\n${message}`,
      customer,
      tracer,
    });

    span.setAttribute("beeai.triage.route", result.triage.route);
    span.setAttribute("beeai.escalated", result.escalation.escalated);
    span.end();
    return result;
  });

  const ticket = {
    id: uuidv4(),
    customerId,
    customerName: customer?.name ?? "Unknown",
    title,
    message,
    status:
      workflowResult.escalation.escalated ? "Escalated to human" : "Auto-handled by agents",
    createdAt: new Date().toISOString(),
    workflowResult,
  };

  db.data.tickets.unshift(ticket);
  workflowCounter.add(1, { route: workflowResult.triage.route, tier: customer?.tier || "unknown" });
  if (workflowResult.escalation.escalated) {
    escalatedCounter.add(1, { queue: workflowResult.escalation.queue });
  }
  recordTelemetry("beeai.workflow.executed", {
    workflowId: workflowResult.workflowId,
    ticketId: ticket.id,
    route: workflowResult.triage.route,
    proactiveAction: workflowResult.proactive.action,
  });
  await db.write();

  if (source === "helpdesk") {
    return res.redirect(`/helpdesk?role=${role}`);
  }

  res.render("beeai", {
    role,
    customers: db.data.customers,
    tickets: db.data.tickets.slice(0, 10),
    telemetry: db.data.telemetry.slice(0, 12),
    integrations: db.data.integrations,
    workflowResult,
  });
});

app.post("/chat/send", async (req, res) => {
  const role = getRole(req);
  const source = (req.body.source || "helpdesk").toString();
  const { customerId, senderRole, senderName, senderId, text } = req.body;
  const wantsJson = req.is("application/json");
  if (!text?.trim()) {
    if (wantsJson) {
      return res.status(400).json({ error: "Message text required" });
    }
    const fallbackPath = source === "customer" ? "/customer" : `/helpdesk?role=${role}`;
    return res.redirect(fallbackPath);
  }

  await db.read();
  ensureHelpdeskState();
  const customer = db.data.customers.find((item) => item.id === customerId);
  const conversationId = `conv-${customerId || "general"}`;
  const assignedAgent = assignAgentToConversation(conversationId);

  const userMessage = {
    id: uuidv4(),
    conversationId,
    senderRole: senderRole || "customer",
    senderId: senderId || null,
    senderName: senderName || "Anonymous",
    text: text.trim(),
    routedAgentId: assignedAgent?.id || null,
    createdAt: new Date().toISOString(),
  };
  db.data.chatMessages.push(userMessage);
  chatMessageCounter.add(1, { sender: userMessage.senderRole });

  if (userMessage.senderRole === "customer" && assignedAgent) {
    const workflowResult = createWorkflowResult({
      ticketText: userMessage.text,
      customer,
      tracer,
    });
    recordTelemetry("beeai.chat.routed_to_agent", {
      conversationId,
      agentId: assignedAgent.id,
      workflowId: workflowResult.workflowId,
    });
    const waitingMessage = {
      id: uuidv4(),
      conversationId,
      senderRole: "system",
      senderId: "router",
      senderName: "Helpdesk Router",
      text: `Please wait. ${assignedAgent.name} has been notified and can accept your chat request.`,
      createdAt: new Date().toISOString(),
    };
    db.data.chatMessages.push(waitingMessage);
    chatMessageCounter.add(1, { sender: "system" });
  } else if (userMessage.senderRole === "customer" && !assignedAgent) {
    const queueMessage = {
      id: uuidv4(),
      conversationId,
      senderRole: "system",
      senderId: "queue",
      senderName: "Helpdesk Router",
      text: "All agents are currently unavailable. Your message is queued.",
      createdAt: new Date().toISOString(),
    };
    db.data.chatMessages.push(queueMessage);
    chatMessageCounter.add(1, { sender: "system" });
  }

  recordTelemetry("beeai.chat.message_sent", {
    conversationId,
    senderRole: userMessage.senderRole,
    routedAgentId: assignedAgent?.id || "none",
  });
  await db.write();
  if (wantsJson) {
    return res.json({ ok: true, conversationId, routedAgentId: assignedAgent?.id || null });
  }
  if (source === "customer") {
    return res.redirect("/customer");
  }
  return res.redirect(`/helpdesk?role=${role}`);
});

app.get("/api/tickets", async (_req, res) => {
  await db.read();
  res.json({ tickets: db.data.tickets });
});

app.get("/api/telemetry", async (_req, res) => {
  await db.read();
  res.json({ telemetry: db.data.telemetry });
});

app.get("/api/chat", async (_req, res) => {
  await db.read();
  ensureHelpdeskState();
  res.json({ chatMessages: db.data.chatMessages, conversationAssignments: db.data.conversationAssignments });
});

app.get("/api/helpdesk/inbox", async (req, res) => {
  await db.read();
  ensureHelpdeskState();
  const agentId = (req.query.agentId || "").toString();
  const assignments = Object.entries(db.data.conversationAssignments).filter(([, assignment]) => assignment.agentId === agentId);
  const assignedConversationIds = assignments
    .filter(([, assignment]) => assignment.status === "accepted")
    .map(([conversationId]) => conversationId);
  const pendingRequests = assignments
    .filter(([, assignment]) => assignment.status === "pending")
    .map(([conversationId]) => ({ conversationId, ...db.data.conversationAssignments[conversationId] }));
  const inboxMessages = db.data.chatMessages.filter((msg) => assignedConversationIds.includes(msg.conversationId));
  res.json({
    agentId,
    assignedConversationIds,
    pendingRequests,
    chatMessages: inboxMessages.slice(-100),
  });
});

app.get("/api/customer/chat", async (req, res) => {
  await db.read();
  ensureHelpdeskState();
  const customerId = (req.query.customerId || "").toString();
  const conversationId = `conv-${customerId || "general"}`;
  const assigned = db.data.conversationAssignments[conversationId];
  const assignedAgent = db.data.helpdeskAgents.find((agent) => agent.id === assigned?.agentId) || null;
  const messages = db.data.chatMessages.filter((msg) => msg.conversationId === conversationId).slice(-100);
  res.json({ conversationId, assignedAgent, assignmentStatus: assigned?.status || null, messages });
});

app.post("/api/helpdesk/agent-status", async (req, res) => {
  await db.read();
  ensureHelpdeskState();
  const { agentId, state } = req.body;
  const agent = db.data.helpdeskAgents.find((item) => item.id === agentId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }
  const nextState = ["online", "busy", "offline"].includes(state) ? state : "offline";
  agent.state = nextState;
  await db.write();
  res.json({ ok: true, agent });
});

app.get("/api/helpdesk/agents", async (_req, res) => {
  await db.read();
  ensureHelpdeskState();
  const agents = db.data.helpdeskAgents.map((agent) => ({ ...agent, load: getAgentLoad(agent.id) }));
  res.json({ agents });
});

app.post("/api/helpdesk/assignment-action", async (req, res) => {
  await db.read();
  ensureHelpdeskState();
  const { agentId, conversationId, action } = req.body;
  const assignment = db.data.conversationAssignments[conversationId];
  if (!assignment || assignment.agentId !== agentId) {
    return res.status(404).json({ error: "Assignment not found" });
  }

  if (action === "accept") {
    assignment.status = "accepted";
    assignment.acceptedAt = new Date().toISOString();
    recordTelemetry("beeai.chat.assignment.accepted", { agentId, conversationId });
    await db.write();
    return res.json({ ok: true, assignment });
  }

  if (action === "reject") {
    assignment.status = "rejected";
    assignment.rejectedAt = new Date().toISOString();

    const rerouteAgent = db.data.helpdeskAgents
      .filter((agent) => agent.id !== agentId && agent.state === "online")
      .sort((a, b) => getAgentLoad(a.id) - getAgentLoad(b.id))[0];

    if (rerouteAgent) {
      db.data.conversationAssignments[conversationId] = {
        agentId: rerouteAgent.id,
        status: "pending",
        assignedAt: new Date().toISOString(),
      };
      db.data.chatMessages.push({
        id: uuidv4(),
        conversationId,
        senderRole: "system",
        senderId: "router",
        senderName: "Helpdesk Router",
        text: `${agentId} rejected chat. Routed to ${rerouteAgent.name} for acceptance.`,
        createdAt: new Date().toISOString(),
      });
    } else {
      db.data.chatMessages.push({
        id: uuidv4(),
        conversationId,
        senderRole: "system",
        senderId: "router",
        senderName: "Helpdesk Router",
        text: `${agentId} rejected chat. No other online agent available; chat remains queued.`,
        createdAt: new Date().toISOString(),
      });
    }
    recordTelemetry("beeai.chat.assignment.rejected", { agentId, conversationId });
    await db.write();
    return res.json({ ok: true, rerouted: Boolean(rerouteAgent) });
  }

  return res.status(400).json({ error: "Invalid action" });
});

app.listen(port, () => {
  console.log(`BeeAI support demo running on http://localhost:${port}`);
});
