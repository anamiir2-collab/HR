/* ============================================================
   AGRIMASTERS HR — Audit Trail Service
   Logs significant actions: record creation, edits, deletions,
   approvals, payroll finalization, imports/exports, etc.
   Stored in the 'auditLog' collection. Respects settings.auditEnabled.
   ============================================================ */
window.ZenAudit = (function () {
  'use strict';

  const S = window.ZenStore;
  const Auth = window.ZenAuth;

  /** Log an audit entry.
   *  @param {string} action  - e.g. 'create', 'update', 'delete', 'approve', 'reject', 'finalize', 'import', 'export', 'archive', 'restore', 'login', 'logout'
   *  @param {string} entity  - collection name, e.g. 'employees', 'payroll'
   *  @param {string} entityId- id of the affected record (optional)
   *  @param {object} detail  - free-form metadata (before/after, reason, etc.)
   */
  function log(action, entity, entityId, detail) {
    if (!S.settings || !S.settings.auditEnabled) return;
    try {
      const user = Auth.currentUser() || { user: 'system', name: 'النظام', nameEn: 'System' };
      const entry = {
        id: 'aud-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        action: String(action || ''),
        entity: String(entity || ''),
        entityId: entityId ? String(entityId) : null,
        detail: detail || {},
        user: user.user || 'admin',
        userName: user.name || 'مدير الموارد البشرية',
        timestamp: new Date().toISOString(),
      };
      const items = S.getCollection('auditLog');
      items.push(entry);
      // Cap audit log size to prevent unbounded growth (keep last 5000)
      if (items.length > 5000) items.splice(0, items.length - 5000);
      S.setCollection('auditLog', items);
      return entry;
    } catch (e) {
      console.warn('[AGRIMASTERS HR] Audit log write failed:', e);
    }
  }

  /** Convenience wrappers */
  function logCreate(entity, id, detail) { return log('create', entity, id, detail); }
  function logUpdate(entity, id, detail) { return log('update', entity, id, detail); }
  function logDelete(entity, id, detail) { return log('delete', entity, id, detail); }
  function logApprove(entity, id, detail) { return log('approve', entity, id, detail); }
  function logReject(entity, id, detail) { return log('reject', entity, id, detail); }
  function logFinalize(entity, id, detail) { return log('finalize', entity, id, detail); }
  function logImport(entity, detail) { return log('import', entity, null, detail); }
  function logExport(entity, detail) { return log('export', entity, null, detail); }
  function logArchive(entity, id, detail) { return log('archive', entity, id, detail); }
  function logRestore(entity, id, detail) { return log('restore', entity, id, detail); }

  /** Get filtered audit log */
  function query(opts) {
    opts = opts || {};
    let rows = S.getCollection('auditLog');
    if (opts.action) rows = rows.filter((r) => r.action === opts.action);
    if (opts.entity) rows = rows.filter((r) => r.entity === opts.entity);
    if (opts.user) rows = rows.filter((r) => r.user === opts.user);
    if (opts.from) rows = rows.filter((r) => r.timestamp >= opts.from);
    if (opts.to) rows = rows.filter((r) => r.timestamp <= opts.to);
    if (opts.search) {
      const q = String(opts.search).toLowerCase();
      rows = rows.filter((r) =>
        (r.action || '').toLowerCase().includes(q) ||
        (r.entity || '').toLowerCase().includes(q) ||
        (r.entityId || '').toLowerCase().includes(q) ||
        (r.userName || '').toLowerCase().includes(q) ||
        JSON.stringify(r.detail || {}).toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return rows;
  }

  function clear() {
    S.setCollection('auditLog', []);
  }

  return {
    log, logCreate, logUpdate, logDelete, logApprove, logReject,
    logFinalize, logImport, logExport, logArchive, logRestore,
    query, clear,
  };
})();
