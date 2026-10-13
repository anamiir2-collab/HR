/* ============================================================
   ZenHR — UI Helpers (modals, toasts, badges, tables, etc.)
   ============================================================ */
window.ZenUI = (function () {
  'use strict';

  const U = window.ZenUtils;

  function toast(msg, type, title) {
    const root = document.getElementById('toast-root');
    if (!root) return alert(msg);
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    const icons = { success: '✓', error: '✕', warning: '!', info: 'ℹ' };
    el.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-body">
        ${title ? `<div class="toast-title">${U.esc(title)}</div>` : ''}
        <div class="toast-msg">${U.esc(msg)}</div>
      </div>`;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(10px)';
      el.style.transition = 'opacity .25s, transform .25s';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  }

  function modal({ title, subtitle, body, footer, size, onClose }) {
    const root = document.getElementById('modal-root');
    if (!root) return null;
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    const m = document.createElement('div');
    m.className = 'modal' + (size ? ' ' + size : '');
    m.innerHTML = `
      <div class="modal-head">
        <div>
          <h3>${U.esc(title || '')}</h3>
          ${subtitle ? `<p>${U.esc(subtitle)}</p>` : ''}
        </div>
        <button type="button" class="icon-btn" data-close="1" aria-label="إغلاق">×</button>
      </div>
      <div class="modal-body"></div>
      ${footer ? `<div class="modal-foot"></div>` : ''}
    `;
    const bodyEl = m.querySelector('.modal-body');
    if (typeof body === 'string') bodyEl.innerHTML = body;
    else if (body instanceof Node) bodyEl.appendChild(body);

    if (footer) {
      const footEl = m.querySelector('.modal-foot');
      if (typeof footer === 'string') footEl.innerHTML = footer;
      else if (Array.isArray(footer)) {
        footer.forEach((btn) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn ' + (btn.kind || 'secondary');
          b.textContent = btn.label;
          b.onclick = () => { if (btn.onClick) btn.onClick(m, bodyEl); };
          footEl.appendChild(b);
        });
      } else if (footer instanceof Node) footEl.appendChild(footer);
    }

    back.appendChild(m);
    root.appendChild(back);

    function close() {
      if (!back.isConnected || back.dataset.closing === '1') return;
      back.dataset.closing = '1';
      back.style.opacity = '0';
      back.style.transition = 'opacity .15s';
      setTimeout(() => {
        back.remove();
        if (typeof onClose === 'function') onClose();
      }, 150);
    }

    // Footer callbacks historically receive the modal element as their first
    // argument and call mm.close(). Expose close() on that element so these
    // callbacks do not throw TypeError and interrupt save/delete workflows.
    m.close = close;

    back.addEventListener('click', (e) => {
      if (e.target === back) close();
    });
    m.querySelector('[data-close]').onclick = close;

    return { el: m, bodyEl, close };
  }

  function confirm({ title, message, confirmLabel, kind, onConfirm, onCancel }) {
    // Normalize every destructive delete/remove confirmation in one place so
    // all modules use the same clear wording and actions.
    // Standardize every real destructive action. A blocked operation may use
    // a delete-related title to explain why it cannot proceed, so only force
    // the generic deletion prompt when an actual confirmation callback exists.
    const isDelete = typeof onConfirm === 'function' &&
      /حذف|delete|remove|إزالة/i.test(String(title || '') + ' ' + String(message || ''));
    const dialogTitle = isDelete ? 'تأكيد الحذف' : (title || 'تأكيد');
    const dialogMessage = isDelete ? 'هل أنت متأكد من الحذف؟' : (message || 'هل أنت متأكد؟');
    const dialogConfirmLabel = isDelete ? 'تأكيد' : (confirmLabel || 'تأكيد');
    const dialogCancelLabel = isDelete ? 'إلغاء' : ((window.ZenI18n && ZenI18n.t('common.cancel')) || 'إلغاء');
    const m = modal({
      title: dialogTitle,
      size: 'sm',
      body: `
        <div style="text-align:center">
          <div class="confirm-icon ${kind || 'warning'}">!</div>
          <p style="margin:0;color:var(--gray-700);font-size:14px">${dialogMessage}</p>
        </div>
      `,
      footer: [
        { label: dialogCancelLabel, kind: 'secondary', onClick: (mm) => { mm.close(); if (onCancel) onCancel(); } },
        {
          label: dialogConfirmLabel,
          kind: kind === 'danger' ? 'danger' : 'primary',
          onClick: (mm) => { mm.close(); if (onConfirm) onConfirm(); }
        }
      ],
    });
    return m;
  }

  function badge(label, kind) {
    return `<span class="badge ${kind || 'gray'}"><i></i>${U.esc(label)}</span>`;
  }

  function statusBadge(status) {
    const map = {
      active: 'success', approved: 'success', paid: 'success', completed: 'success', present: 'success',
      pending: 'warning', late: 'warning', draft: 'warning', processed: 'info',
      on_leave: 'info', remote: 'info',
      rejected: 'danger', cancelled: 'danger', absent: 'danger', terminated: 'danger', resigned: 'gray',
      inactive: 'gray', excused: 'info',
    };
    const key = 'status.' + status;
    const label = (window.ZenI18n && ZenI18n.t(key, status)) || status;
    return badge(label, map[status] || 'gray');
  }

  function avatarCell(name, sub) {
    const ini = U.initials(name);
    const color = U.avatarColor(name);
    return `<div class="employee-cell">
      <div class="avatar small-avatar ${color}">${U.esc(ini)}</div>
      <div>${name ? `<b>${U.esc(name)}</b>` : ''}${sub ? `<small>${U.esc(sub)}</small>` : ''}</div>
    </div>`;
  }

  function empty(icon, title, msg, action) {
    return `<div class="empty-state">
      <div class="empty-icon">${icon || '∅'}</div>
      <h3>${U.esc(title || 'لا توجد بيانات')}</h3>
      <p>${U.esc(msg || 'ابدأ بإضافة سجلات جديدة')}</p>
      ${action || ''}
    </div>`;
  }

  function pagination(container, page, pageSize, total, onChange) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    let buttons = '';
    const max = 5;
    let from = Math.max(1, page - 2);
    let to = Math.min(pages, from + max - 1);
    if (to - from < max - 1) from = Math.max(1, to - max + 1);

    if (from > 1) buttons += `<button data-page="1">1</button>` + (from > 2 ? `<button disabled>…</button>` : '');
    for (let i = from; i <= to; i++) {
      buttons += `<button data-page="${i}" class="${i === page ? 'active' : ''}">${i}</button>`;
    }
    if (to < pages) buttons += (to < pages - 1 ? `<button disabled>…</button>` : '') + `<button data-page="${pages}">${pages}</button>`;

    container.innerHTML = `
      <div class="pagination">
        <div class="info">${total === 0 ? 'لا سجلات' : `${start} - ${end} من ${total}`}</div>
        <div class="pages">
          <button data-page="${Math.max(1, page - 1)}" ${page === 1 ? 'disabled' : ''}>‹</button>
          ${buttons}
          <button data-page="${Math.min(pages, page + 1)}" ${page === pages ? 'disabled' : ''}>›</button>
        </div>
        <div class="page-size">
          <span>${(window.ZenI18n && ZenI18n.t('common.total')) || 'الإجمالي'}:</span>
          <select data-page-size>
            ${[10, 20, 50, 100].map((s) => `<option value="${s}" ${s === pageSize ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
    container.querySelectorAll('[data-page]').forEach((b) => {
      if (b.disabled) return;
      b.onclick = () => onChange(parseInt(b.dataset.page, 10), pageSize);
    });
    container.querySelector('[data-page-size]').onchange = (e) => onChange(1, parseInt(e.target.value, 10));
  }

  function buildTable({ columns, rows, empty_msg }) {
    if (!rows || rows.length === 0) {
      return empty('∅', (window.ZenI18n && ZenI18n.t('common.empty')) || 'لا توجد سجلات', empty_msg || '');
    }
    return `<div class="table-scroll"><table class="data">
      <thead><tr>${columns.map((c) => `<th class="${c.sortable === false ? 'no-sort' : ''}">${U.esc(c.label)}${c.sortable !== false ? '<span class="sort-ind">↕</span>' : ''}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${c.render ? c.render(r) : U.esc(r[c.key] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function formField({ label, name, type, value, required, options, placeholder, attrs }) {
    const r = required ? ' required' : '';
    const p = placeholder ? ` placeholder="${U.esc(placeholder)}"` : '';
    const a = attrs || '';
    if (type === 'select') {
      const opts = (options || []).map((o) => `<option value="${U.esc(o.value)}" ${o.value === value ? 'selected' : ''}>${U.esc(o.label)}</option>`).join('');
      return `<label class="field"><span>${U.esc(label)}${required ? ' *' : ''}</span><select name="${name}"${r}${a}>${opts}</select></label>`;
    }
    if (type === 'textarea') {
      return `<label class="field"><span>${U.esc(label)}${required ? ' *' : ''}</span><textarea name="${name}" rows="3"${r}${p}${a}>${U.esc(value || '')}</textarea></label>`;
    }
    return `<label class="field"><span>${U.esc(label)}${required ? ' *' : ''}</span><input type="${type || 'text'}" name="${name}" value="${U.esc(value ?? '')}"${r}${p}${a}></label>`;
  }

  function buildForm(fields, layout) {
    const items = fields.map((f) => {
      const cls = f.full ? 'full' : '';
      return `<div class="${cls}">${formField(f)}</div>`;
    }).join('');
    if (layout === 'grid') return `<div class="form-grid">${items}</div>`;
    return items;
  }

  function readForm(formEl) {
    const data = {};
    formEl.querySelectorAll('[name]').forEach((el) => {
      const k = el.getAttribute('name');
      if (el.type === 'checkbox') data[k] = el.checked;
      else data[k] = el.value;
    });
    return data;
  }

  function fillSelect(sel, options, valueKey, labelKey, allLabel) {
    sel.innerHTML = (allLabel ? `<option value="">${allLabel}</option>` : '') +
      options.map((o) => `<option value="${U.esc(o[valueKey])}">${U.esc(o[labelKey])}</option>`).join('');
  }

  function donutSvg(data, size) {
    size = size || 140;
    const r = size / 2 - 10;
    const cx = size / 2;
    const cy = size / 2;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let offset = 0;
    const circ = 2 * Math.PI * r;
    const segments = data.map((d, i) => {
      const frac = d.value / total;
      const len = frac * circ;
      const dash = `${len} ${circ - len}`;
      const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="16" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
      offset += len;
      return seg;
    }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f1f5f9" stroke-width="16"></circle>
      ${segments}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="18" font-weight="700" fill="#0f172a">${total}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#64748b">${(window.ZenI18n && ZenI18n.t('common.total')) || 'الإجمالي'}</text>
    </svg>`;
  }

  function barChart(data, max) {
    max = max || Math.max(...data.map((d) => d.value), 1);
    const cols = data.map((d) => {
      const h = Math.max(2, Math.round((d.value / max) * 180));
      return `<div class="bar-col">
        <div class="bar-value">${U.esc(U.num(d.value))}</div>
        <div class="bar" style="height:${h}px" title="${U.esc(d.label)}: ${U.esc(d.value)}"></div>
        <div class="bar-label">${U.esc(d.label)}</div>
      </div>`;
    }).join('');
    return `<div class="chart-bar">${cols}</div>`;
  }

  function lineChart(data, max) {
    max = max || Math.max(...data.map((d) => d.value), 1);
    const w = 100, h = 100;
    const step = data.length > 1 ? w / (data.length - 1) : w;
    const points = data.map((d, i) => `${i * step},${h - (d.value / max) * h}`).join(' ');
    return `<svg width="100%" height="160" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${points}" fill="none" stroke="#0f766e" stroke-width="2" vector-effect="non-scaling-stroke" />
      ${data.map((d, i) => `<circle cx="${i * step}" cy="${h - (d.value / max) * h}" r="2" fill="#0f766e"></circle>`).join('')}
    </svg>`;
  }

  return {
    toast, modal, confirm, badge, statusBadge, avatarCell, empty,
    pagination, buildTable, formField, buildForm, readForm, fillSelect,
    donutSvg, barChart, lineChart,
  };
})();
