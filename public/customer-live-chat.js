const customerForm = document.getElementById("customerChatForm");
const customerSelect = document.getElementById("customerId");
const customerChatBox = document.getElementById("customerChatBox");
const assignedAgentInfo = document.getElementById("assignedAgentInfo");

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
  const data = await fetch(`/api/customer/chat?customerId=${encodeURIComponent(customerId)}`).then((r) => r.json());
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
  const payload = Object.fromEntries(new FormData(customerForm).entries());
  await fetch("/chat/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  document.getElementById("text").value = "";
  await refreshConversation();
});

customerSelect.addEventListener("change", refreshConversation);
refreshConversation();
setInterval(refreshConversation, 2000);
