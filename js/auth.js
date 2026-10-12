(function (global) {
  // واجهة دخول محلية تجريبية فقط؛ ليست نظام مصادقة آمنًا.
  const Auth = {
    getUser() { try { return JSON.parse(localStorage.getItem("zenhr_user")) || { name: "أمير أنور", role: "مدير النظام" }; } catch (_) { return { name: "أمير أنور", role: "مدير النظام" }; } },
    signIn(name) { const user = { name: String(name || "مستخدم").trim(), role: "مدير النظام" }; localStorage.setItem("zenhr_user", JSON.stringify(user)); return user; },
    signOut() { localStorage.removeItem("zenhr_user"); }
  };
  global.ZenHR = global.ZenHR || {};
  global.ZenHR.Auth = Auth;
})(window);