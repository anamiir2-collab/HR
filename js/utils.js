(function (global) {
  const Utils = {
    id(prefix = "item") { return prefix + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    date(value = new Date()) { return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value)); },
    money(value, currency = "EGP") { return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value) || 0); },
    download(filename, content, type = "text/plain;charset=utf-8") {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
  global.ZenHR = global.ZenHR || {};
  global.ZenHR.Utils = Utils;
})(window);