(function (global) {
  const UI = {
    toast(message, type = "info") {
      const root = document.getElementById("toast-root");
      if (!root) return;
      const item = document.createElement("div");
      item.className = "toast toast-" + type;
      item.textContent = String(message);
      root.appendChild(item);
      setTimeout(() => item.remove(), 3200);
    },
    escape(value) {
      return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
    }
  };
  global.ZenHR = global.ZenHR || {};
  global.ZenHR.UI = UI;
})(window);