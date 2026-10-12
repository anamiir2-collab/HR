(function (global) {
  const Router = {
    current: "dashboard",
    go(page) {
      this.current = page || "dashboard";
      global.dispatchEvent(new CustomEvent("zenhr:navigate", { detail: { page: this.current } }));
      return this.current;
    },
    getCurrent() { return this.current; }
  };
  global.ZenHR = global.ZenHR || {};
  global.ZenHR.Router = Router;
})(window);