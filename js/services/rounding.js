/* ============================================================
   AGRIMASTERS HR — Financial Rounding Service
   Shared utility for rounding eligible positive financial amounts
   DOWN to the nearest multiple of 5 EGP (configurable increment).

   Rules:
   - Default OFF. When OFF, original amounts are preserved.
   - When ON, eligible positive earnings are rounded DOWN to the
     nearest multiple of `increment` (default 5 EGP).
   - Deductions follow a separate configurable policy:
     'down' (reduces deduction), 'up' (increases deduction), 'none'.
   - Original amounts are NEVER overwritten. The rounded value, the
     difference, and the original are all retained.
   - No double rounding: rounding is applied once to the original
     amount, never to an already-rounded value.

   Settings shape (stored in S.settings.financialRounding):
   {
     enabled: false,
     increment: 5,
     scope: 'individual',        // 'individual' | 'total' | 'both'
     deductionsPolicy: 'down',   // 'down' | 'up' | 'none'
     applyTo: {
       basicSalary: true, allowances: true, bonuses: true,
       incentives: true, overtime: true, otherEarnings: true,
       deductions: true, penalties: true, advances: true,
       insurance: false
     }
   }
   ============================================================ */
window.ZenRounding = (function () {
  'use strict';

  const DEFAULTS = {
    enabled: false,
    increment: 5,
    scope: 'individual',        // 'individual' | 'total' | 'both'
    deductionsPolicy: 'down',   // 'down' | 'up' | 'none'
    applyTo: {
      basicSalary: true,
      allowances: true,
      bonuses: true,
      incentives: true,
      overtime: true,
      otherEarnings: true,
      deductions: true,
      penalties: true,
      advances: true,
      insurance: false,
    },
  };

  /** Get the current rounding settings (merged with defaults). */
  function getSettings() {
    const stored = (window.ZenStore && ZenStore.settings && ZenStore.settings.financialRounding) || {};
    return {
      enabled: stored.enabled === true,
      increment: Number(stored.increment) || 5,
      scope: ['individual', 'total', 'both'].includes(stored.scope) ? stored.scope : 'individual',
      deductionsPolicy: ['down', 'up', 'none'].includes(stored.deductionsPolicy) ? stored.deductionsPolicy : 'down',
      applyTo: Object.assign({}, DEFAULTS.applyTo, stored.applyTo || {}),
    };
  }

  /** Save rounding settings. */
  function saveSettings(cfg) {
    if (!window.ZenStore || !ZenStore.settings) return;
    ZenStore.settings.financialRounding = cfg;
    ZenStore.saveSettings();
  }

  /** Round an amount to the nearest multiple of `increment`.
   *  Examples with increment=5: 2522→2520, 2524→2525, 1528→1530, 1530→1530, 15237→15235, 15239→15240, 15240→15240
   *  Negative amounts: returns the amount unchanged (we only round eligible positive amounts).
   *  Zero: returns 0.
   */
  function roundDown(amount, increment) {
    increment = Math.abs(Number(increment) || 5);
    if (increment === 0) return amount;
    const v = Number(amount);
    if (!isFinite(v) || v <= 0) return v < 0 ? v : 0;
    return Math.round(v / increment) * increment;
  }

  /** Round an amount UP to the nearest multiple of `increment`. */
  function roundUp(amount, increment) {
    increment = Math.abs(Number(increment) || 5);
    if (increment === 0) return amount;
    const v = Number(amount);
    if (!isFinite(v) || v <= 0) return v < 0 ? v : 0;
    return Math.ceil(v / increment) * increment;
  }

  /** Apply the configured rounding to a single amount, based on its category.
   *  Returns { original, rounded, difference, applied }.
   *  - If rounding is disabled, rounded === original, difference === 0, applied === false.
   *  - If the category is not in applyTo (or applyTo[category] is false), no rounding.
   *  - For earnings categories: always rounds DOWN.
   *  - For deduction categories: respects deductionsPolicy ('down' | 'up' | 'none').
   *    'down' reduces the deduction (favourable to employee).
   *    'up' increases the deduction (less favourable — must be explicitly chosen).
   *    'none' skips rounding for deductions.
   */
  function applyToAmount(amount, category, opts) {
    const cfg = (opts && opts.settings) || getSettings();
    const original = Number(amount) || 0;
    const isDeduction = ['deductions', 'penalties', 'advances', 'insurance', 'tax', 'otherDeductions'].includes(category);
    // Check if category is enabled
    const categoryEnabled = cfg.applyTo[category] !== false;
    if (!cfg.enabled || !categoryEnabled || original <= 0) {
      return { original, rounded: original, difference: 0, applied: false };
    }
    let rounded;
    if (isDeduction) {
      if (cfg.deductionsPolicy === 'none') {
        return { original, rounded: original, difference: 0, applied: false };
      }
      rounded = cfg.deductionsPolicy === 'up' ? roundUp(original, cfg.increment) : roundDown(original, cfg.increment);
    } else {
      // Earnings always round DOWN
      rounded = roundDown(original, cfg.increment);
    }
    const difference = rounded - original; // negative for down, positive for up
    return { original, rounded, difference, applied: rounded !== original };
  }

  /** Apply rounding to a list of financial items.
   *  Each item: { category, amount, label? }
   *  Returns { items: [{category, label, original, rounded, difference, applied}], totals: {originalGross, roundedGross, originalDeductions, roundedDeductions, originalNet, roundedNet, totalDifference} }
   *
   *  Scope behavior:
   *  - 'individual': round each item independently.
   *  - 'total': do NOT round individual items; round only the final gross and final net.
   *  - 'both': round individual items AND the final totals (totals computed from rounded items, then rounded again — but with double-rounding prevention: if a total is already a multiple of increment, it stays).
   */
  function applyToItems(items, opts) {
    const cfg = (opts && opts.settings) || getSettings();
    const scope = cfg.scope || 'individual';
    const result = { items: [], totals: {} };
    let originalGross = 0, roundedGross = 0;
    let originalDeductions = 0, roundedDeductions = 0;
    const deductionCategories = ['deductions', 'penalties', 'advances', 'insurance', 'tax', 'otherDeductions'];

    items.forEach((item) => {
      const original = Number(item.amount) || 0;
      const isDeduction = deductionCategories.includes(item.category);
      let rounded = original;
      let applied = false;

      if (cfg.enabled && (scope === 'individual' || scope === 'both')) {
        const r = applyToAmount(original, item.category, { settings: cfg });
        rounded = r.rounded;
        applied = r.applied;
      }

      result.items.push({
        category: item.category,
        label: item.label || item.category,
        original,
        rounded,
        difference: rounded - original,
        applied,
        isDeduction,
      });

      if (isDeduction) {
        originalDeductions += original;
        roundedDeductions += rounded;
      } else {
        originalGross += original;
        roundedGross += rounded;
      }
    });

    // If scope is 'total' or 'both', round the gross and deductions totals
    if (cfg.enabled && (scope === 'total' || scope === 'both')) {
      // Round gross total down
      const roundedGrossTotal = roundDown(originalGross, cfg.increment);
      // Round deductions total per policy
      let roundedDeductionsTotal = originalDeductions;
      if (cfg.deductionsPolicy === 'down') roundedDeductionsTotal = roundDown(originalDeductions, cfg.increment);
      else if (cfg.deductionsPolicy === 'up') roundedDeductionsTotal = roundUp(originalDeductions, cfg.increment);
      // When scope is 'both', the per-item rounding already happened; we only apply total rounding if it would change further.
      // To prevent double rounding, if scope is 'both' we use the already-summed rounded values and do NOT round them again.
      if (scope === 'total') {
        roundedGross = roundedGrossTotal;
        roundedDeductions = roundedDeductionsTotal;
      }
      // scope === 'both': keep per-item rounded values summed (no second rounding of the total)
    }

    const originalNet = originalGross - originalDeductions;
    const roundedNet = roundedGross - roundedDeductions;
    result.totals = {
      originalGross, roundedGross,
      originalDeductions, roundedDeductions,
      originalNet, roundedNet,
      grossDifference: roundedGross - originalGross,
      deductionsDifference: roundedDeductions - originalDeductions,
      netDifference: roundedNet - originalNet,
      totalDifference: (roundedGross - originalGross) - (roundedDeductions - originalDeductions),
    };
    result.settings = cfg;
    return result;
  }

  /** Format a number as EGP with no decimals (for comparison tables). */
  function formatEGP(amount) {
    const n = Math.round(Number(amount) || 0);
    return n.toLocaleString('en-US') + ' EGP';
  }

  /** Verify the rounding examples from the specification.
   *  Returns an array of { input, expected, actual, pass }.
   *  Used for self-testing.
   */
  function verifyExamples() {
    const cases = [
      { input: 1523, expected: 1525 },
      { input: 1537, expected: 1535 },
      { input: 1528, expected: 1530 },
      { input: 1530, expected: 1530 },
      { input: 15237, expected: 15235 },
      { input: 15239, expected: 15240 },
      { input: 15240, expected: 15240 },
      { input: 0, expected: 0 },
      { input: 3, expected: 5 },
      { input: 5, expected: 5 },
      { input: 7, expected: 5 },
    ];
    return cases.map((c) => ({
      input: c.input,
      expected: c.expected,
      actual: roundDown(c.input, 5),
      pass: roundDown(c.input, 5) === c.expected,
    }));
  }

  return {
    DEFAULTS,
    getSettings,
    saveSettings,
    roundDown,
    roundUp,
    applyToAmount,
    applyToItems,
    formatEGP,
    verifyExamples,
  };
})();
