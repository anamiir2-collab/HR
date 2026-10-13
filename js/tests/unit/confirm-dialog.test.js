/**
 * Unit tests for the shared ZenUI.confirm dialog.
 *
 * Verifies the AGRIMASTERS HR spec requirements:
 *   - Exact Arabic text: title="تأكيد الحذف", message="هل أنت متأكد من الحذف؟",
 *     confirm="تأكيد", cancel="إلغاء"
 *   - Cancel never invokes onConfirm
 *   - Escape never invokes onConfirm
 *   - Outside-click never invokes onConfirm
 *   - Repeated clicks invoke onConfirm exactly once
 *   - Async onConfirm that throws does NOT close the dialog or show false success
 *   - Standard text is forced for ANY delete-related title/message
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetStorage } from '../helpers/reset.js';

const UI = window.ZenUI;

beforeEach(() => {
  resetStorage();
  document.getElementById('modal-root').innerHTML = '';
});

/** Simulate a click on a footer button by its label text. */
function clickFooterButton(label) {
  const buttons = document.querySelectorAll('.modal-foot button');
  for (const b of buttons) {
    if (b.textContent.trim() === label) { b.click(); return b; }
  }
  throw new Error(`Footer button "${label}" not found. Available: ${[...buttons].map((b) => b.textContent).join(', ')}`);
}

/** Get the confirm dialog's message paragraph. */
function getDialogMessage() {
  return document.querySelector('#confirm-dlg-msg');
}

/** Get the confirm dialog's title (modal-head h3). */
function getDialogTitle() {
  return document.querySelector('.modal-head h3');
}

describe('UI.confirm — standardized Arabic text for delete actions', () => {
  it('forces تأكيد الحذف / هل أنت متأكد من الحذف؟ / تأكيد / إلغاء', () => {
    UI.confirm({
      title: 'حذف الموظف',
      message: 'هل تريد حذف هذا الموظف؟',
      kind: 'danger',
      onConfirm: () => {},
    });
    expect(getDialogTitle().textContent).toBe('تأكيد الحذف');
    expect(getDialogMessage().textContent).toBe('هل أنت متأكد من الحذف؟');
    const labels = [...document.querySelectorAll('.modal-foot button')].map((b) => b.textContent.trim());
    expect(labels).toContain('تأكيد');
    expect(labels).toContain('إلغاء');
  });

  it('forces standard text even when caller passes English title', () => {
    UI.confirm({
      title: 'Delete employee',
      message: 'Delete this employee?',
      kind: 'danger',
      onConfirm: () => {},
    });
    expect(getDialogTitle().textContent).toBe('تأكيد الحذف');
    expect(getDialogMessage().textContent).toBe('هل أنت متأكد من الحذف؟');
  });

  it('forces standard text when title contains "remove"', () => {
    UI.confirm({
      title: 'إزالة الجدول',
      message: 'هل تريد الإزالة؟',
      kind: 'warning',
      onConfirm: () => {},
    });
    expect(getDialogTitle().textContent).toBe('تأكيد الحذف');
    expect(getDialogMessage().textContent).toBe('هل أنت متأكد من الحذف؟');
  });

  it('does NOT force standard text when onConfirm is missing (informational dialog)', () => {
    // Some modules use confirm() with just a title + message + OK button to
    // explain why an action is blocked. Those should keep their custom text.
    UI.confirm({
      title: 'لا يمكن حذف الموظف',
      message: 'لديه سجلات مرتبطة',
      kind: 'warning',
      confirmLabel: 'حسنًا',
    });
    expect(getDialogTitle().textContent).toBe('لا يمكن حذف الموظف');
    expect(getDialogMessage().textContent).toBe('لديه سجلات مرتبطة');
  });

  it('uses custom text for non-delete confirmations', () => {
    UI.confirm({
      title: 'تسجيل الخروج',
      message: 'هل تريد الخروج؟',
      kind: 'warning',
      confirmLabel: 'خروج',
      onConfirm: () => {},
    });
    expect(getDialogTitle().textContent).toBe('تسجيل الخروج');
    expect(getDialogMessage().textContent).toBe('هل تريد الخروج؟');
  });
});

describe('UI.confirm — cancel behavior', () => {
  it('clicking إلغاء does NOT invoke onConfirm', () => {
    const onConfirm = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    clickFooterButton('إلغاء');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clicking إلغاء invokes onCancel when supplied', () => {
    const onCancel = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger',
      onConfirm: () => {}, onCancel,
    });
    clickFooterButton('إلغاء');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('pressing Escape closes the dialog without invoking onConfirm', () => {
    const onConfirm = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    // The app's global Escape handler triggers [data-close] on the modal.
    // Simulate that directly since the handler is wired in app.js, not ui.js.
    const closeBtn = document.querySelector('.modal-head [data-close]');
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clicking the modal close (×) button does NOT invoke onConfirm', () => {
    const onConfirm = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    document.querySelector('.modal-head [data-close]').click();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clicking the backdrop does NOT invoke onConfirm', () => {
    const onConfirm = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    // The modal backdrop click handler calls close() which is the same path
    // as the × button. Simulate the backdrop click event directly.
    const backdrop = document.querySelector('.modal-backdrop');
    backdrop.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('UI.confirm — confirm behavior', () => {
  it('clicking تأكيد invokes onConfirm exactly once', () => {
    const onConfirm = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    clickFooterButton('تأكيد');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('repeated rapid clicks on تأكيد invoke onConfirm at most once', () => {
    const onConfirm = vi.fn();
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    // Click confirm 5 times in the same tick — the double-click guard
    // should ensure only the first click runs.
    for (let i = 0; i < 5; i++) clickFooterButton('تأكيد');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables both footer buttons immediately after confirm click', () => {
    let sawDisabled = false;
    const onConfirm = vi.fn(() => {
      // Inspect button state at the moment onConfirm runs.
      const btns = document.querySelectorAll('.modal-foot button');
      btns.forEach((b) => { if (b.disabled) sawDisabled = true; });
    });
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    clickFooterButton('تأكيد');
    expect(sawDisabled).toBe(true);
  });

  it('awaits an async onConfirm before closing the dialog', async () => {
    let resolved = false;
    const onConfirm = () => new Promise((r) => setTimeout(() => { resolved = true; r(); }, 30));
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    clickFooterButton('تأكيد');
    // Immediately after click, the dialog should still be open (promise pending)
    expect(document.querySelector('.modal-backdrop')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 60));
    expect(resolved).toBe(true);
  });

  it('does NOT close the dialog and shows an error toast when onConfirm throws', () => {
    const toastSpy = vi.spyOn(UI, 'toast').mockImplementation(() => {});
    const onConfirm = () => { throw new Error('storage failed'); };
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    clickFooterButton('تأكيد');
    expect(toastSpy).toHaveBeenCalledWith(expect.any(String), 'error');
    // Dialog stays open so the user can retry.
    expect(document.querySelector('.modal-backdrop')).toBeTruthy();
    toastSpy.mockRestore();
  });

  it('re-enables the footer buttons after onConfirm throws, allowing retry', () => {
    let calls = 0;
    const onConfirm = () => { calls++; if (calls === 1) throw new Error('fail'); };
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm,
    });
    clickFooterButton('تأكيد');
    expect(calls).toBe(1);
    // After the throw, buttons should be re-enabled — clicking again should retry.
    const btns = document.querySelectorAll('.modal-foot button');
    expect([...btns].some((b) => !b.disabled)).toBe(true);
    clickFooterButton('تأكيد');
    expect(calls).toBe(2);
  });
});

describe('UI.confirm — focus management', () => {
  it('moves focus to the confirm button shortly after opening', async () => {
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm: () => {},
    });
    await new Promise((r) => setTimeout(r, 50));
    const btns = document.querySelectorAll('.modal-foot button');
    const confirmBtn = btns[1]; // cancel=0, confirm=1
    expect(document.activeElement).toBe(confirmBtn);
  });
});

describe('UI.confirm — accessibility', () => {
  it('marks the dialog with role=alertdialog and aria-modal=true', () => {
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm: () => {},
    });
    const dlg = document.querySelector('[role="alertdialog"]');
    expect(dlg).toBeTruthy();
    expect(dlg.getAttribute('aria-modal')).toBe('true');
  });

  it('links the title and message via aria-labelledby / aria-describedby', () => {
    UI.confirm({
      title: 'حذف', message: 'حذف؟', kind: 'danger', onConfirm: () => {},
    });
    const dlg = document.querySelector('[role="alertdialog"]');
    expect(dlg.getAttribute('aria-labelledby')).toBe('confirm-dlg-title');
    expect(dlg.getAttribute('aria-describedby')).toBe('confirm-dlg-msg');
  });
});
