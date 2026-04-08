function attachSplitter(container) {
  const splitter = container.querySelector(".splitter");
  if (!splitter) return;

  const storageKey = container.getAttribute("data-split-key");
  const saved = storageKey ? localStorage.getItem(storageKey) : null;
  if (saved) {
    container.style.setProperty("--left-pane", saved);
  }

  let dragging = false;

  const onMove = (event) => {
    if (!dragging) return;
    const rect = container.getBoundingClientRect();
    const minPx = 320;
    const maxPx = rect.width - minPx - 10;
    const currentPx = Math.min(maxPx, Math.max(minPx, event.clientX - rect.left));
    const leftPercent = `${(currentPx / rect.width) * 100}%`;
    container.style.setProperty("--left-pane", leftPercent);
    if (storageKey) {
      localStorage.setItem(storageKey, leftPercent);
    }
  };

  const stopDrag = () => {
    dragging = false;
    container.classList.remove("dragging");
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", stopDrag);
  };

  splitter.addEventListener("mousedown", () => {
    dragging = true;
    container.classList.add("dragging");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stopDrag);
  });

  splitter.addEventListener("dblclick", () => {
    const resetValue = "50%";
    container.style.setProperty("--left-pane", resetValue);
    if (storageKey) {
      localStorage.setItem(storageKey, resetValue);
    }
  });
}

document.querySelectorAll(".two-pane").forEach((container) => attachSplitter(container));
