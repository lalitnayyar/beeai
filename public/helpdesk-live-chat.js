const agentLoginSelect = document.getElementById("agentLoginSelect");
const agentStateSelect = document.getElementById("agentStateSelect");
const agentStatusInfo = document.getElementById("agentStatusInfo");
const pendingRequestPopup = document.getElementById("pendingRequestPopup");
const opSenderId = document.getElementById("opSenderId");
const opSenderName = document.getElementById("opSenderName");
const opConversationId = document.getElementById("opConversationId");
const opSessionSelect = document.getElementById("opSessionSelect");
const opNewSessionBtn = document.getElementById("opNewSessionBtn");
const opResetSessionBtn = document.getElementById("opResetSessionBtn");
const chatForm = document.getElementById("helpdeskChatForm");
const chatBox = document.getElementById("helpdeskChatBox");
const customerContextSelect = document.getElementById("opChatCustomerId");

function getAgentName(agentId) {
  return `Support ${agentId.toUpperCase()}`;
}

function formatDateTime(timestamp) {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleString();
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDayLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  return isToday ? "Today" : date.toLocaleDateString();
}

function roleBadgeLabel(role) {
  if (role === "agent") return "Agent";
  if (role === "customer") return "Customer";
  return "System";
}

async function setAgentStatus(agentId, state) {
  await fetch("/api/helpdesk/agent-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, state }),
  });
}

function renderMessages(messages) {
  const ordered = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let previousDay = "";
  chatBox.innerHTML = ordered
    .map((msg) => {
      const roleClass = msg.senderRole === "agent" ? "agent" : msg.senderRole === "system" ? "system" : "customer";
      const currentDay = getDayLabel(msg.createdAt);
      const separatorHtml =
        currentDay !== previousDay ? `<div class="chat-day-separator"><span>${currentDay}</span></div>` : "";
      previousDay = currentDay;
      return `${separatorHtml}<div class="chat-message ${roleClass}">
        <div class="msg-header">
          <span class="msg-sender">${msg.senderName}</span>
          <span class="msg-time">${formatRelativeTime(msg.createdAt)} | ${formatDateTime(msg.createdAt)}</span>
        </div>
        <div class="msg-meta"><span class="role-badge ${roleClass}">${roleBadgeLabel(msg.senderRole)}</span></div>
        <div class="msg-body">${msg.text}</div>
      </div>`;
    })
    .join("");
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function refreshInbox() {
  const agentId = agentLoginSelect.value;
  const selectedConversationId = opConversationId.value;
  const query = selectedConversationId
    ? `agentId=${encodeURIComponent(agentId)}&conversationId=${encodeURIComponent(selectedConversationId)}`
    : `agentId=${encodeURIComponent(agentId)}`;
  const result = await fetch(`/api/helpdesk/inbox?${query}`).then((r) => r.json());
  renderMessages(result.chatMessages || []);
  agentStatusInfo.textContent = `Assigned conversations: ${(result.assignedConversationIds || []).length} | Pending: ${(result.pendingRequests || []).length}`;
  renderPendingRequests(result.pendingRequests || []);
}

function formatSessionLabel(session) {
  return `${new Date(session.updatedAt).toLocaleString()} - ${session.id}`;
}

async function loadSessionsForCustomer(keepSelection = true) {
  const customerId = customerContextSelect.value;
  const existing = keepSelection ? opSessionSelect.value : "";
  const data = await fetch(`/api/chat/sessions?customerId=${encodeURIComponent(customerId)}`).then((r) => r.json());
  opSessionSelect.innerHTML = (data.sessions || [])
    .map((session) => `<option value="${session.id}">${formatSessionLabel(session)}</option>`)
    .join("");
  if (existing && (data.sessions || []).some((session) => session.id === existing)) {
    opSessionSelect.value = existing;
  }
  opConversationId.value = opSessionSelect.value || "";
}

async function refreshAgentDirectory() {
  const data = await fetch("/api/helpdesk/agents").then((r) => r.json());
  const selected = agentLoginSelect.value;
  agentLoginSelect.innerHTML = (data.agents || [])
    .map((agent) => `<option value="${agent.id}">${agent.name} (${agent.state})</option>`)
    .join("");
  if ((data.agents || []).some((agent) => agent.id === selected)) {
    agentLoginSelect.value = selected;
  }
  const current = (data.agents || []).find((agent) => agent.id === agentLoginSelect.value);
  if (current) {
    agentStateSelect.value = current.state;
  }
}

async function handleAssignmentAction(conversationId, action) {
  await fetch("/api/helpdesk/assignment-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId: agentLoginSelect.value, conversationId, action }),
  });
  await refreshInbox();
}

function renderPendingRequests(pendingRequests) {
  if (pendingRequests.length === 0) {
    pendingRequestPopup.classList.add("hidden");
    pendingRequestPopup.innerHTML = "";
    return;
  }

  pendingRequestPopup.classList.remove("hidden");
  pendingRequestPopup.innerHTML = pendingRequests
    .map(
      (request) => `<div class="pending-row">
        <strong>Awaiting chat:</strong> ${request.conversationId}
        <div class="pending-actions">
          <button type="button" data-action="accept" data-conversation="${request.conversationId}">Accept</button>
          <button type="button" data-action="reject" data-conversation="${request.conversationId}" class="secondary">Reject</button>
        </div>
      </div>`,
    )
    .join("");

  pendingRequestPopup.querySelectorAll("button[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await handleAssignmentAction(button.dataset.conversation, button.dataset.action);
    });
  });
}

agentLoginSelect.addEventListener("change", async () => {
  const agentId = agentLoginSelect.value;
  opSenderId.value = agentId;
  opSenderName.value = getAgentName(agentId);
  await refreshAgentDirectory();
  await refreshInbox();
});

agentStateSelect.addEventListener("change", async () => {
  await setAgentStatus(agentLoginSelect.value, agentStateSelect.value);
  await refreshAgentDirectory();
  await refreshInbox();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!opConversationId.value) {
    const created = await fetch("/api/chat/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customerContextSelect.value }),
    }).then((r) => r.json());
    opConversationId.value = created.conversationId;
  }
  const payload = Object.fromEntries(new FormData(chatForm).entries());
  await fetch("/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  document.getElementById("opChatText").value = "";
  await loadSessionsForCustomer();
  await refreshInbox();
});

opSessionSelect.addEventListener("change", async () => {
  opConversationId.value = opSessionSelect.value;
  await refreshInbox();
});

customerContextSelect.addEventListener("change", async () => {
  await loadSessionsForCustomer(false);
  await refreshInbox();
});

opNewSessionBtn.addEventListener("click", async () => {
  const created = await fetch("/api/chat/sessions/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: customerContextSelect.value }),
  }).then((r) => r.json());
  await loadSessionsForCustomer();
  opSessionSelect.value = created.conversationId;
  opConversationId.value = created.conversationId;
  chatBox.innerHTML = "";
  await refreshInbox();
});

opResetSessionBtn.addEventListener("click", async () => {
  if (!opConversationId.value) return;
  await fetch("/api/chat/sessions/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: opConversationId.value }),
  });
  chatBox.innerHTML = "";
  await loadSessionsForCustomer();
  await refreshInbox();
});

opSenderId.value = agentLoginSelect.value;
opSenderName.value = getAgentName(agentLoginSelect.value);
refreshAgentDirectory()
  .then(() => loadSessionsForCustomer(false))
  .then(refreshInbox);
setInterval(async () => {
  await refreshAgentDirectory();
  await loadSessionsForCustomer();
  await refreshInbox();
}, 2000);
