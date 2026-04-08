const customerForm = document.getElementById("customerChatForm");
const customerSelect = document.getElementById("customerId");
const customerChatBox = document.getElementById("customerChatBox");
const assignedAgentInfo = document.getElementById("assignedAgentInfo");
const customerConversationId = document.getElementById("customerConversationId");
const customerSessionSelect = document.getElementById("customerSessionSelect");
const customerNewSessionBtn = document.getElementById("customerNewSessionBtn");
const customerResetSessionBtn = document.getElementById("customerResetSessionBtn");

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

function formatSessionLabel(session) {
  return `${new Date(session.updatedAt).toLocaleString()} - ${session.id}`;
}

function hydrateSessionSelect(sessions, keepCurrent = true) {
  const current = keepCurrent ? customerSessionSelect.value : "";
  customerSessionSelect.innerHTML = (sessions || [])
    .map((session) => `<option value="${session.id}">${formatSessionLabel(session)}</option>`)
    .join("");
  if (current && (sessions || []).some((session) => session.id === current)) {
    customerSessionSelect.value = current;
  }
  customerConversationId.value = customerSessionSelect.value || "";
}

function renderMessages(messages) {
  const ordered = [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  let previousDay = "";
  customerChatBox.innerHTML = ordered
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
  customerChatBox.scrollTop = customerChatBox.scrollHeight;
}

async function refreshConversation() {
  const customerId = customerSelect.value;
  if (!customerId) return;
  const query = customerConversationId.value
    ? `customerId=${encodeURIComponent(customerId)}&conversationId=${encodeURIComponent(customerConversationId.value)}`
    : `customerId=${encodeURIComponent(customerId)}`;
  const data = await fetch(`/api/customer/chat?${query}`).then((r) => r.json());
  hydrateSessionSelect(data.sessions || []);
  customerConversationId.value = data.conversationId || customerConversationId.value;
  renderMessages(data.messages || []);
  if (data.assignedAgent && data.assignmentStatus === "pending") {
    assignedAgentInfo.textContent = `Waiting for ${data.assignedAgent.name} (${data.assignedAgent.id}) to accept your chat...`;
  } else if (data.assignedAgent && data.assignmentStatus === "accepted") {
    assignedAgentInfo.textContent = `Assigned agent: ${data.assignedAgent.name} (${data.assignedAgent.id})`;
  } else if (data.assignedAgent && data.assignmentStatus === "rejected") {
    assignedAgentInfo.textContent = "Previous agent rejected. Re-routing to another available agent...";
  } else {
    assignedAgentInfo.textContent = "Waiting for available helpdesk agent assignment.";
  }
}

customerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!customerConversationId.value) {
    const created = await fetch("/api/chat/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId: customerSelect.value }),
    }).then((r) => r.json());
    customerConversationId.value = created.conversationId;
    hydrateSessionSelect(created.sessions || [], false);
    customerSessionSelect.value = created.conversationId;
  }
  const payload = Object.fromEntries(new FormData(customerForm).entries());
  await fetch("/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  document.getElementById("text").value = "";
  await refreshConversation();
});

customerSelect.addEventListener("change", async () => {
  customerConversationId.value = "";
  await refreshConversation();
});

customerSessionSelect.addEventListener("change", async () => {
  customerConversationId.value = customerSessionSelect.value;
  await refreshConversation();
});

customerNewSessionBtn.addEventListener("click", async () => {
  const created = await fetch("/api/chat/sessions/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId: customerSelect.value }),
  }).then((r) => r.json());
  hydrateSessionSelect(created.sessions || [], false);
  customerSessionSelect.value = created.conversationId;
  customerConversationId.value = created.conversationId;
  customerChatBox.innerHTML = "";
  assignedAgentInfo.textContent = "New session created. Start chatting.";
});

customerResetSessionBtn.addEventListener("click", async () => {
  if (!customerConversationId.value) return;
  await fetch("/api/chat/sessions/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId: customerConversationId.value }),
  });
  customerChatBox.innerHTML = "";
  assignedAgentInfo.textContent = "Selected session reset. Chat feed cleared.";
  await refreshConversation();
});

refreshConversation();
setInterval(refreshConversation, 2000);
