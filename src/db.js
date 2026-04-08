import { JSONFilePreset } from "lowdb/node";

const defaultData = {
  customers: [
    {
      id: "cust-100",
      name: "Acme Logistics",
      tier: "enterprise",
      churnRisk: 0.7,
      ticketsRaised: 14,
      csat: 3.2,
    },
    {
      id: "cust-101",
      name: "Northwind Stores",
      tier: "pro",
      churnRisk: 0.2,
      ticketsRaised: 3,
      csat: 4.6,
    },
  ],
  tickets: [],
  chatMessages: [
    {
      id: "chat-1",
      conversationId: "conv-100",
      senderRole: "customer",
      senderName: "Acme Logistics",
      text: "Our order tracking API is timing out for EU users.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "chat-2",
      conversationId: "conv-100",
      senderRole: "agent",
      senderName: "Support Agent Ava",
      text: "Thanks for reporting this. I am checking service health and drafting next steps now.",
      createdAt: new Date().toISOString(),
    },
  ],
  helpdeskAgents: [
    { id: "agent1", name: "Support Agent 1", state: "online" },
    { id: "agent2", name: "Support Agent 2", state: "online" },
    { id: "agent3", name: "Support Agent 3", state: "offline" },
  ],
  conversationAssignments: {},
  telemetry: [],
  integrations: {
    salesforce: { connected: true, org: "Acme-Sandbox" },
    helpdesk: { connected: true, provider: "LocalDesk" },
    knowledgeBase: { connected: true, source: "kb/local-articles.json" },
  },
};

export async function createDb() {
  return JSONFilePreset("data/db.json", defaultData);
}
