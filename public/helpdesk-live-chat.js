const agentLoginSelect = document.getElementById("agentLoginSelect");
const agentStateSelect = document.getElementById("agentStateSelect");
const agentStatusInfo = document.getElementById("agentStatusInfo");
const pendingRequestPopup = document.getElementById("pendingRequestPopup");
const opSenderId = document.getElementById("opSenderId");
const opSenderName = document.getElementById("opSenderName");
const chatForm = document.getElementById("helpdeskChatForm");
const chatBox = document.getElementById("helpdeskChatBox");

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
  const result = await fetch(`/api/helpdesk/inbox?agentId=${encodeURIComponent(agentId)}`).then((r) => r.json());
  renderMessages(result.chatMessages || []);
  agentStatusInfo.textContent = `Assigned conversations: ${(result.assignedConversationIds || []).length} | Pending: ${(result.pendingRequests || []).length}`;
  renderPendingRequests(result.pendingRequests || []);
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
  const payload = Object.fromEntries(new FormData(chatForm).entries());
  await fetch("/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  document.getElementById("opChatText").value = "";
  await refreshInbox();
});

opSenderId.value = agentLoginSelect.value;
opSenderName.value = getAgentName(agentLoginSelect.value);
refreshAgentDirectory().then(refreshInbox);
setInterval(async () => {
  await refreshAgentDirectory();
  await refreshInbox();
}, 2000);
