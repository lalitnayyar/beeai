import { v4 as uuidv4 } from "uuid";

const keywordMaps = {
  billing: ["invoice", "charge", "payment", "refund", "billing"],
  technical: ["error", "bug", "crash", "timeout", "login", "api"],
  shipping: ["delivery", "shipment", "tracking", "order", "delay"],
};

const faqPatterns = [/password reset/i, /business hours/i, /how to/i, /where can i/i];

function detectCategory(text) {
  const content = text.toLowerCase();
  for (const [category, words] of Object.entries(keywordMaps)) {
    if (words.some((word) => content.includes(word))) {
      return category;
    }
  }
  return "general";
}

function detectUrgency(text) {
  const content = text.toLowerCase();
  if (/(outage|urgent|critical|down|cannot|can't access)/i.test(content)) {
    return "high";
  }
  if (/(soon|asap|blocked|delay)/i.test(content)) {
    return "medium";
  }
  return "low";
}

function isFaq(text) {
  return faqPatterns.some((pattern) => pattern.test(text));
}

function draftToneFromTier(tier) {
  return tier === "enterprise" ? "high-touch" : "friendly-standard";
}

export function runTriageAgent({ ticketText, customer }) {
  const category = detectCategory(ticketText);
  const urgency = detectUrgency(ticketText);
  const faq = isFaq(ticketText);
  const shouldEscalate = urgency === "high" || (customer?.tier === "enterprise" && !faq);
  const route = faq ? "self-service-bot" : shouldEscalate ? "human-escalation" : "auto-resolution";

  return {
    agent: "Ticket Triage Agent",
    category,
    urgency,
    faq,
    route,
    reason: faq
      ? "Matched FAQ pattern; routed to self-service."
      : shouldEscalate
        ? "High priority or premium account needs human oversight."
        : "Safe for auto-resolution flow.",
  };
}

export function runResponseDraftingAgent({ ticketText, customer, triage }) {
  const tone = draftToneFromTier(customer?.tier ?? "pro");
  const intro = `Hi ${customer?.name ?? "there"},`;
  const triageLine = `We have categorized your request as ${triage.category} with ${triage.urgency} urgency.`;
  const workflowLine = triage.faq
    ? "You can likely resolve this quickly through our self-service guide."
    : "Our support workflow has started diagnostics and next-step validation.";

  const draft = [
    intro,
    "",
    "Thanks for contacting support.",
    triageLine,
    workflowLine,
    "If needed, we will escalate your ticket to a specialist and keep you updated.",
    "",
    "Best regards,",
    "Support Team",
  ].join("\n");

  return {
    agent: "Response Drafting Agent",
    tone,
    toolsUsed: ["knowledge-base", "order-status-api(mock)"],
    draft,
  };
}

export function runEscalationRoutingAgent({ triage, customer }) {
  const queue =
    triage.urgency === "high"
      ? "P1-Incident-Queue"
      : triage.category === "billing"
        ? "Billing-Specialists"
        : "General-Support";

  return {
    agent: "Escalation Routing Agent",
    escalated: triage.route === "human-escalation",
    queue: triage.route === "human-escalation" ? queue : "N/A",
    owner:
      triage.route === "human-escalation"
        ? customer?.tier === "enterprise"
          ? "Enterprise Success Manager"
          : "Support Lead"
        : "Automation Bot",
  };
}

export function runProactiveSupportAgent({ customer }) {
  const churnRisk = customer?.churnRisk ?? 0;
  const lowCsat = (customer?.csat ?? 5) < 3.5;
  const highVolume = (customer?.ticketsRaised ?? 0) >= 10;

  const shouldProactivelyReachOut = churnRisk > 0.6 || lowCsat || highVolume;
  const action = shouldProactivelyReachOut
    ? "Trigger proactive outreach with diagnostics checklist"
    : "Monitor only";

  return {
    agent: "Proactive Support Agent",
    churnRisk,
    signal: { lowCsat, highVolume },
    shouldProactivelyReachOut,
    action,
  };
}

export function createWorkflowResult({ ticketText, customer, tracer }) {
  const triage = tracer
    ? tracer.startActiveSpan("agent.ticket_triage", (span) => {
        const triageOutput = runTriageAgent({ ticketText, customer });
        span.setAttribute("beeai.triage.category", triageOutput.category);
        span.setAttribute("beeai.triage.urgency", triageOutput.urgency);
        span.end();
        return triageOutput;
      })
    : runTriageAgent({ ticketText, customer });

  const response = tracer
    ? tracer.startActiveSpan("agent.response_drafting", (span) => {
        const responseOutput = runResponseDraftingAgent({ ticketText, customer, triage });
        span.setAttribute("beeai.response.tone", responseOutput.tone);
        span.end();
        return responseOutput;
      })
    : runResponseDraftingAgent({ ticketText, customer, triage });

  const escalation = tracer
    ? tracer.startActiveSpan("agent.escalation_routing", (span) => {
        const escalationOutput = runEscalationRoutingAgent({ triage, customer });
        span.setAttribute("beeai.escalation.queue", escalationOutput.queue);
        span.end();
        return escalationOutput;
      })
    : runEscalationRoutingAgent({ triage, customer });

  const proactive = tracer
    ? tracer.startActiveSpan("agent.proactive_support", (span) => {
        const proactiveOutput = runProactiveSupportAgent({ customer });
        span.setAttribute("beeai.proactive.outreach", proactiveOutput.shouldProactivelyReachOut);
        span.end();
        return proactiveOutput;
      })
    : runProactiveSupportAgent({ customer });

  return {
    workflowId: uuidv4(),
    startedAt: new Date().toISOString(),
    triage,
    response,
    escalation,
    proactive,
  };
}
