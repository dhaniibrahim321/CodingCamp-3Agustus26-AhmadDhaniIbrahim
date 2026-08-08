/* Expense & Budget Visualizer — application logic */

// =============================================================================
// SECTION 1: Constants & Configuration
// =============================================================================

const STORAGE_KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CUSTOM_CATEGORIES: 'ebv_custom_categories',
  THEME: 'ebv_theme'
};

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

const MAX_CUSTOM_CATEGORIES = 20;
const MAX_ITEM_NAME_LENGTH = 100;
const MAX_CUSTOM_CATEGORY_LENGTH = 50;
const AMOUNT_MIN = 0.01;
const AMOUNT_MAX = 999_999_999.99;
const BALANCE_MAX = 999_999_999_999;

// =============================================================================
// SECTION 2: AppState (Single Source of Truth)
// =============================================================================

const AppState = {
  transactions: [],  // Transaction[]
  categories: [],    // string[] — ['Food', 'Transport', 'Fun', ...custom]
  theme: 'light'     // 'light' | 'dark'
};

// =============================================================================
// SECTION 3: Utility Functions
// =============================================================================

/**
 * Generate a UUID v4 string.
 * Uses crypto.randomUUID() when available, falls back to manual construction.
 * @returns {string} UUID v4 string
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Manual fallback: RFC 4122 version 4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format a number as Indonesian Rupiah currency with two decimal places.
 * Example: 1234567.89 → "Rp 1.234.567,89"
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  // Split integer and decimal parts
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  // Add thousands separators (period) to integer part
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return 'Rp ' + intFormatted + ',' + decPart;
}

/**
 * Format a number as Indonesian Rupiah without decimal places.
 * Example: 1234567 → "Rp 1.234.567"
 * @param {number} amount
 * @returns {string}
 */
function formatBalance(amount) {
  const rounded = Math.round(amount);
  const intFormatted = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return 'Rp ' + intFormatted;
}

/**
 * Format a timestamp as full Indonesian month name + 4-digit year.
 * Example: 1700000000000 → "November 2023"
 * @param {number} timestamp - milliseconds since epoch (Date.now())
 * @returns {string}
 */
function formatMonthYear(timestamp) {
  const MONTH_NAMES_ID = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const date = new Date(timestamp);
  const monthName = MONTH_NAMES_ID[date.getMonth()];
  const year = date.getFullYear();
  return monthName + ' ' + year;
}

/**
 * Get a "YYYY-MM" key string from a timestamp for month-based grouping.
 * Example: 1700000000000 → "2023-11"
 * @param {number} timestamp - milliseconds since epoch (Date.now())
 * @returns {string}
 */
function getMonthKey(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return year + '-' + month;
}

/**
 * Clamp a balance total to BALANCE_MAX.
 * Returns the clamped value and a flag indicating whether overflow occurred.
 * @param {number} total
 * @returns {{ value: number, overflow: boolean }}
 */
function clampBalance(total) {
  if (total > BALANCE_MAX) {
    return { value: BALANCE_MAX, overflow: true };
  }
  return { value: total, overflow: false };
}

// =============================================================================
// SECTION 3: LocalStorage Wrappers
// =============================================================================

const Storage = {
  /**
   * Detect whether LocalStorage is available by performing a dummy write/read/delete.
   * Returns false if the API is blocked (e.g., private browsing, security policy).
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const testKey = '__ebv_test__';
      localStorage.setItem(testKey, '1');
      localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Serialize the transactions array to JSON and persist it under STORAGE_KEYS.TRANSACTIONS.
   * On failure, calls showStorageError() if defined.
   * @param {Array} transactions - Array of Transaction objects
   */
  saveTransactions(transactions) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      // Re-throw so callers (e.g. addTransaction, deleteTransaction) can detect
      // the failure, rollback AppState, and handle the error themselves.
      throw e;
    }
  },

  /**
   * Load transactions from LocalStorage, parse JSON, and validate each object's schema.
   * If the data is missing, corrupt, or contains any invalid object, returns [] and
   * calls showCorruptDataNotification() if the data was present but invalid.
   * @returns {Array} Validated array of Transaction objects, or [] on any failure.
   */
  loadTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);

      // Nothing stored yet — fresh start, no notification needed
      if (raw === null) {
        return [];
      }

      const parsed = JSON.parse(raw);

      // Must be an array
      if (!Array.isArray(parsed)) {
        if (typeof showCorruptDataNotification === 'function') {
          showCorruptDataNotification();
        }
        return [];
      }

      // Validate every transaction object against the schema
      const isValid = parsed.every(function (t) {
        return (
          typeof t.id === 'string' && t.id.length > 0 &&
          typeof t.name === 'string' && t.name.length > 0 &&
          typeof t.amount === 'number' && isFinite(t.amount) && t.amount > 0 &&
          typeof t.category === 'string' && t.category.length > 0 &&
          typeof t.timestamp === 'number' && isFinite(t.timestamp) && t.timestamp > 0
        );
      });

      if (!isValid) {
        if (typeof showCorruptDataNotification === 'function') {
          showCorruptDataNotification();
        }
        return [];
      }

      return parsed;
    } catch (e) {
      // JSON.parse threw — data is corrupt
      if (typeof showCorruptDataNotification === 'function') {
        showCorruptDataNotification();
      }
      return [];
    }
  },

  /**
   * Serialize the custom categories array to JSON and persist it under STORAGE_KEYS.CUSTOM_CATEGORIES.
   * On failure, calls showStorageError() if defined.
   * @param {string[]} categories - Array of custom category name strings
   */
  saveCustomCategories(categories) {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      if (typeof showStorageError === 'function') {
        showStorageError('saveCustomCategories');
      }
    }
  },

  /**
   * Load custom categories from LocalStorage, parse JSON, and validate the result is a
   * non-empty array of strings. Returns [] if the key is absent, parsing fails, or the
   * data is not a valid string array.
   * @returns {string[]} Array of custom category strings, or [] on any failure.
   */
  loadCustomCategories() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);

      // Nothing stored yet — no custom categories
      if (raw === null) {
        return [];
      }

      const parsed = JSON.parse(raw);

      // Must be an array of strings
      if (!Array.isArray(parsed) || !parsed.every(function (item) { return typeof item === 'string'; })) {
        return [];
      }

      return parsed;
    } catch (e) {
      return [];
    }
  },

  /**
   * Save the theme string to LocalStorage under STORAGE_KEYS.THEME.
   * On failure, calls showStorageError() if defined.
   * @param {string} theme - Theme identifier, e.g. 'light' or 'dark'
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
      if (typeof showStorageError === 'function') {
        showStorageError('saveTheme');
      }
    }
  },

  /**
   * Read the stored theme from LocalStorage.
   * Returns null if the key does not exist (localStorage.getItem returns null).
   * @returns {string|null} Stored theme string, or null if not set.
   */
  loadTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME);
  }
};

// =============================================================================
// SECTION 4: Validation
// =============================================================================

/**
 * Validate the transaction form fields before submission.
 *
 * Rules:
 *  - name   : tidak kosong setelah trim, panjang 1–100 karakter
 *  - amount : bukan NaN, AMOUNT_MIN ≤ amount ≤ AMOUNT_MAX
 *  - category: tidak kosong, harus ada di AppState.categories
 *
 * @param {string} name     - Item name value from the input field
 * @param {number} amount   - Numeric amount (already parsed, not the raw string)
 * @param {string} category - Selected category value
 * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
 */
function validateTransactionForm(name, amount, category) {
  const errors = {};

  // --- Validate name ---
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName.length === 0) {
    errors.name = 'Nama item tidak boleh kosong.';
  } else if (trimmedName.length > MAX_ITEM_NAME_LENGTH) {
    errors.name = 'Nama item tidak boleh melebihi ' + MAX_ITEM_NAME_LENGTH + ' karakter.';
  }

  // --- Validate amount ---
  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.amount = 'Jumlah harus berupa angka yang valid.';
  } else if (amount < AMOUNT_MIN) {
    errors.amount = 'Jumlah minimal adalah Rp ' + AMOUNT_MIN.toFixed(2).replace('.', ',') + '.';
  } else if (amount > AMOUNT_MAX) {
    errors.amount = 'Jumlah maksimal adalah Rp ' + AMOUNT_MAX.toLocaleString('id-ID') + '.';
  }

  // --- Validate category ---
  const trimmedCategory = typeof category === 'string' ? category.trim() : '';
  if (trimmedCategory.length === 0) {
    errors.category = 'Kategori harus dipilih.';
  } else if (!AppState.categories.includes(trimmedCategory)) {
    errors.category = 'Kategori "' + trimmedCategory + '" tidak ditemukan dalam daftar kategori yang tersedia.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

/**
 * Validate a custom category name before adding it to AppState.
 *
 * Rules:
 *  - Tidak kosong setelah trim
 *  - Panjang ≤ MAX_CUSTOM_CATEGORY_LENGTH (50)
 *  - Tidak duplikat (perbandingan case-insensitive) terhadap kategori yang sudah ada
 *
 * @param {string}   name               - Candidate category name
 * @param {string[]} existingCategories - Full list of current categories (default + custom)
 * @returns {{ valid: boolean, errors: { name?: string } }}
 */
function validateCustomCategory(name, existingCategories) {
  const errors = {};

  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (trimmedName.length === 0) {
    errors.name = 'Nama kategori tidak boleh kosong.';
  } else if (trimmedName.length > MAX_CUSTOM_CATEGORY_LENGTH) {
    errors.name = 'Nama kategori tidak boleh melebihi ' + MAX_CUSTOM_CATEGORY_LENGTH + ' karakter.';
  } else {
    const lowerName = trimmedName.toLowerCase();
    const isDuplicate = existingCategories.some(function (cat) {
      return cat.toLowerCase() === lowerName;
    });
    if (isDuplicate) {
      errors.name = 'Kategori "' + trimmedName + '" sudah ada dalam daftar.';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

// =============================================================================
// SECTION 5: Domain Functions (CRUD)
// =============================================================================

/**
 * Add a new transaction from the input form.
 *
 * Steps:
 *  1. Parse amountStr to float.
 *  2. Validate all fields via validateTransactionForm().
 *     - If invalid: clear existing errors, show per-field errors, focus first
 *       invalid field, and return early.
 *  3. Build a Transaction object and prepend it to AppState.transactions.
 *  4. Persist the updated list to LocalStorage.
 *     - If storage throws: rollback the prepend, show storage error, return
 *       without calling render().
 *  5. Call render() to update the DOM.
 *  6. Reset the form fields (#item-name, #amount cleared; #category = "").
 *
 * @param {string} name       - Value from #item-name input
 * @param {string} amountStr  - Raw string value from #amount input
 * @param {string} category   - Value from #category select
 */
function addTransaction(name, amountStr, category) {
  // Step 1: Parse amount
  const amount = parseFloat(amountStr);

  // Step 2: Validate
  clearFieldErrors();
  const result = validateTransactionForm(name, amount, category);

  if (!result.valid) {
    const fieldOrder = ['name', 'amount', 'category'];
    let firstErrorField = null;

    fieldOrder.forEach(function (field) {
      if (result.errors[field]) {
        // Map validation field names to DOM element IDs
        const fieldIdMap = {
          name: 'item-name',
          amount: 'amount',
          category: 'category'
        };
        showFieldError(fieldIdMap[field], result.errors[field]);
        if (!firstErrorField) {
          firstErrorField = fieldIdMap[field];
        }
      }
    });

    // Focus the first invalid field
    if (firstErrorField) {
      const el = document.getElementById(firstErrorField);
      if (el) el.focus();
    }

    return;
  }

  // Step 3: Build Transaction object and prepend to AppState
  const transaction = {
    id: generateId(),
    name: name.trim(),
    amount: amount,
    category: category,
    timestamp: Date.now()
  };

  AppState.transactions.unshift(transaction);

  // Step 4: Persist to LocalStorage — rollback on failure
  try {
    Storage.saveTransactions(AppState.transactions);
  } catch (e) {
    // Rollback the prepend
    AppState.transactions.shift();
    showStorageError('addTransaction');
    return;
  }

  // Step 5: Update the DOM
  render();

  // Step 6: Reset form fields
  const nameInput = document.getElementById('item-name');
  const amountInput = document.getElementById('amount');
  const categorySelect = document.getElementById('category');

  if (nameInput) nameInput.value = '';
  if (amountInput) amountInput.value = '';
  if (categorySelect) categorySelect.value = '';
}

/**
 * Delete a transaction by its ID.
 *
 * Steps:
 *  1. Find the index of the transaction in AppState.transactions.
 *     - If not found, return early (no-op).
 *  2. Build a new array that excludes the transaction at that index.
 *  3. Persist the new array to LocalStorage via Storage.saveTransactions().
 *     - If storage throws: show storage error and return WITHOUT mutating AppState.
 *  4. Assign the new array to AppState.transactions.
 *  5. Call render() to update the DOM.
 *
 * @param {string} id - The UUID of the transaction to delete
 */
function deleteTransaction(id) {
  // Step 1: Find the index
  const index = AppState.transactions.findIndex(function (t) {
    return t.id === id;
  });

  // Transaction not found — nothing to do
  if (index === -1) {
    return;
  }

  // Step 2: Build a copy of the array without the target transaction
  const newArray = AppState.transactions.filter(function (t) {
    return t.id !== id;
  });

  // Step 3: Persist to LocalStorage — if it fails, do NOT mutate AppState
  try {
    Storage.saveTransactions(newArray);
  } catch (e) {
    showStorageError('deleteTransaction');
    return;
  }

  // Step 4: Commit the mutation to AppState
  AppState.transactions = newArray;

  // Step 5: Re-render the UI
  render();
}

/**
 * Add a new custom category entered by the user.
 *
 * Steps:
 *  1. Trim the input name.
 *  2. Validate via validateCustomCategory() against all current categories.
 *     - If invalid: show the error in #custom-category-error and return early.
 *  3. Clear any existing error on the custom-category field.
 *  4. Insert the new category into AppState.categories, maintaining
 *     case-insensitive alphabetical order.
 *  5. Extract only custom categories (those not in DEFAULT_CATEGORIES).
 *  6. Persist them via Storage.saveCustomCategories().
 *  7. Rebuild the category dropdown via renderCategoryDropdown().
 *  8. Clear the #custom-category-input field.
 *  9. If the custom category count has reached MAX_CUSTOM_CATEGORIES (20):
 *     disable #add-category-btn and show the limit message in
 *     #custom-category-error.
 *
 * @param {string} name - Raw value from #custom-category-input
 */
function addCustomCategory(name) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  // Step 2: Validate — pass the full category list for duplicate detection
  const result = validateCustomCategory(trimmedName, AppState.categories);

  if (!result.valid) {
    showFieldError('custom-category', result.errors.name);
    return;
  }

  // Step 3: Clear any previous error
  showFieldError('custom-category', '');

  // Step 4: Insert maintaining alphabetical order (case-insensitive)
  AppState.categories.push(trimmedName);
  AppState.categories.sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  // Step 5: Extract only custom categories (not defaults)
  const customOnly = AppState.categories.filter(function (c) {
    return !DEFAULT_CATEGORIES.includes(c);
  });

  // Step 6: Persist custom categories to LocalStorage
  Storage.saveCustomCategories(customOnly);

  // Step 7: Rebuild the category dropdown
  renderCategoryDropdown();

  // Step 8: Clear the input field
  const input = document.getElementById('custom-category-input');
  if (input) {
    input.value = '';
  }

  // Step 9: Check if the custom category limit has been reached
  if (customOnly.length >= MAX_CUSTOM_CATEGORIES) {
    const addBtn = document.getElementById('add-category-btn');
    if (addBtn) {
      addBtn.disabled = true;
    }
    showFieldError('custom-category', 'Batas maksimum ' + MAX_CUSTOM_CATEGORIES + ' kategori kustom telah tercapai.');
  }
}

// =============================================================================
// SECTION 6: Rendering Functions
// =============================================================================

/**
 * Update the #balance-display element with the current total of all transactions.
 *
 * - Sums all `amount` values from AppState.transactions (invalid values treated as 0).
 * - Calls clampBalance(total) to get { value, overflow }.
 * - Displays the formatted value via formatBalance(value).
 * - If overflow === true, appends an overflow indicator "⚠ Melebihi batas tampilan".
 * - When no transactions exist, displays "Rp 0".
 */
function renderBalanceDisplay() {
  const el = document.getElementById('balance-display');
  if (!el) return;

  // Sum all valid amounts; treat non-finite or missing values as 0
  const total = AppState.transactions.reduce(function (sum, t) {
    const amt = typeof t.amount === 'number' && isFinite(t.amount) ? t.amount : 0;
    return sum + amt;
  }, 0);

  const clamped = clampBalance(total);
  const formatted = formatBalance(clamped.value);

  if (clamped.overflow) {
    el.innerHTML =
      formatted +
      ' <span class="balance-overflow" aria-live="polite">⚠ Melebihi batas tampilan</span>';
  } else {
    el.textContent = formatted;
  }
}

/**
 * Rebuild the <select id="category"> options from AppState.categories.
 *
 * - Clears all existing options.
 * - Adds a placeholder disabled option as the first entry (no default selected).
 * - Sorts AppState.categories alphabetically (case-insensitive).
 * - Adds one <option> per category.
 * - Leaves the select with no pre-selected value (dropdown shows placeholder).
 */
function renderCategoryDropdown() {
  const select = document.getElementById('category');
  if (!select) return;

  // Clear all existing options
  select.innerHTML = '';

  // Add placeholder (disabled, not selected by default)
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.textContent = '-- Pilih Kategori --';
  select.appendChild(placeholder);

  // Sort categories alphabetically (case-insensitive)
  const sorted = AppState.categories.slice().sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  sorted.forEach(function (category) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });

  // Ensure no option is pre-selected (select shows placeholder)
  select.value = '';
}

// =============================================================================
// SECTION 7: Chart Management
// =============================================================================

let chartInstance = null; // Holds the active Chart.js instance

/**
 * 20 predefined perceptually-distinct colors for the pie chart slices.
 * Used for the first 20 categories; additional colors are generated via HSL.
 */
const PREDEFINED_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f43f5e', '#fb923c', '#facc15', '#4ade80', '#2dd4bf',
  '#60a5fa', '#a78bfa', '#f472b6', '#38bdf8', '#a3e635'
];

/**
 * Aggregate transaction amounts by category.
 *
 * - Iterates over all transactions and sums `amount` per `category`.
 * - Transactions with an empty/missing category are grouped under "Other".
 * - Returns a plain object keyed by category name with total amounts as values.
 *
 * @param {Array} transactions - Array of Transaction objects from AppState
 * @returns {Record<string, number>} Map of category → total amount
 */
function groupByCategory(transactions) {
  const result = {};

  transactions.forEach(function (t) {
    const cat = (typeof t.category === 'string' && t.category.trim().length > 0)
      ? t.category.trim()
      : 'Other';

    const amt = typeof t.amount === 'number' && isFinite(t.amount) ? t.amount : 0;

    if (Object.prototype.hasOwnProperty.call(result, cat)) {
      result[cat] += amt;
    } else {
      result[cat] = amt;
    }
  });

  return result;
}

/**
 * Generate an array of `count` unique color strings for chart slices.
 *
 * - Uses the 20 PREDEFINED_COLORS first.
 * - For any count > 20, appends additional colors generated via the golden
 *   angle HSL rotation: hue = (i * 137.508) % 360, saturation 65%, lightness 55%.
 * - Always returns an array of exactly `count` elements.
 *
 * @param {number} count - Number of colors needed (must be ≥ 1)
 * @returns {string[]} Array of CSS color strings with length === count
 */
function generateChartColors(count) {
  const colors = PREDEFINED_COLORS.slice(); // copy first 20

  // Generate additional colors via golden angle HSL for count > 20
  for (let i = PREDEFINED_COLORS.length; i < count; i++) {
    const hue = (i * 137.508) % 360;
    colors.push('hsl(' + hue.toFixed(2) + ', 65%, 55%)');
  }

  return colors.slice(0, count);
}

/**
 * Render the expense pie chart using Chart.js (destroy + recreate pattern).
 *
 * - If no transactions exist: hides <canvas>, shows #chart-placeholder, destroys
 *   any existing chart instance, and returns early.
 * - If data exists: shows canvas, destroys old instance, creates a new pie chart
 *   with percentage tooltips and a legend at the bottom.
 * - Legend/tooltip label color adapts to AppState.theme
 *   (light: '#1a1a1a', dark: '#f1f1f1').
 */
function renderChart() {
  const data = groupByCategory(AppState.transactions);
  const canvas = document.getElementById('expense-chart');
  const placeholder = document.getElementById('chart-placeholder');

  // No data — show placeholder, hide canvas, destroy stale instance
  if (Object.keys(data).length === 0) {
    canvas.hidden = true;
    placeholder.hidden = false;
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  // Data available — show canvas, hide placeholder
  canvas.hidden = false;
  placeholder.hidden = true;

  const labels = Object.keys(data);
  const values = Object.values(data);
  const total = values.reduce(function (a, b) { return a + b; }, 0);
  const colors = generateChartColors(labels.length);

  // Destroy existing instance before creating a new one
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Label color based on current theme
  const labelColor = AppState.theme === 'dark' ? '#f1f1f1' : '#1a1a1a';

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: labelColor }
        },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return ctx.label + ': ' + pct + '%';
            }
          }
        }
      }
    }
  });
}

// =============================================================================
// SECTION 8: Monthly Grouping
// =============================================================================

/**
 * Group an array of transactions by calendar month and compute a total per group.
 *
 * Each group has the shape:
 *   { key: string, label: string, total: number }
 *
 *   - key   : "YYYY-MM" string produced by getMonthKey(timestamp), e.g. "2024-03"
 *   - label : Indonesian month-year string from formatMonthYear(timestamp), e.g. "Maret 2024"
 *   - total : sum of all `amount` values for transactions in that month
 *
 * The returned array is:
 *   - Sorted descending by key string ("2024-03" > "2024-02") — newest month first.
 *   - Capped at a maximum of 120 entries.
 *
 * @param {Array} transactions - Array of Transaction objects
 * @returns {Array} MonthGroup[] — at most 120 entries, newest-first
 */
function groupByMonth(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  // Accumulate totals and capture one representative timestamp per key
  const map = {};

  transactions.forEach(function (t) {
    const key = getMonthKey(t.timestamp);

    if (!map[key]) {
      map[key] = {
        key: key,
        label: formatMonthYear(t.timestamp),
        total: 0
      };
    }

    const amt = typeof t.amount === 'number' && isFinite(t.amount) ? t.amount : 0;
    map[key].total += amt;
  });

  // Convert to array, sort descending by key string, cap at 120
  return Object.values(map)
    .sort(function (a, b) {
      if (a.key > b.key) return -1;
      if (a.key < b.key) return 1;
      return 0;
    })
    .slice(0, 120);
}

/**
 * Render the monthly summary section (#monthly-summary).
 *
 * - Groups AppState.transactions by month via groupByMonth().
 * - If the result is empty, shows an empty-state paragraph.
 * - Otherwise, renders one row per MonthGroup with the month label and
 *   formatted total using formatCurrency().
 *
 * Requirement 6.2: groups newest-first, capped at 120.
 * Requirement 6.3: full Indonesian month name, 4-digit year, currency format.
 * Requirement 6.4: called by render() so updates automatically on every change.
 * Requirement 6.5: shows empty-state message when there are no transactions.
 */
function renderMonthlySummary() {
  const container = document.getElementById('monthly-summary');
  if (!container) return;

  const groups = groupByMonth(AppState.transactions);

  if (groups.length === 0) {
    container.innerHTML = '<p class="empty-state">Belum ada data ringkasan bulanan.</p>';
    return;
  }

  const html = groups.map(function (group) {
    return (
      '<div class="month-row">' +
        '<span class="month-label">' + group.label + '</span>' +
        '<span class="month-total">' + formatCurrency(group.total) + '</span>' +
      '</div>'
    );
  }).join('');

  container.innerHTML = html;
}

// =============================================================================
// SECTION 9: Theme Management
// =============================================================================

/**
 * Detect the initial theme to apply on page load.
 *
 * Priority order:
 *  1. Value stored in LocalStorage (via Storage.loadTheme()) — respects user's
 *     explicit previous choice.
 *  2. OS-level preference via `prefers-color-scheme: dark` media query.
 *  3. Default fallback: 'light'.
 *
 * This function is intentionally side-effect-free — it only reads, never writes.
 * Call setTheme(detectInitialTheme()) during init() to apply and persist the result.
 *
 * @returns {'light'|'dark'} The resolved initial theme identifier.
 */
function detectInitialTheme() {
  // Priority 1: Explicit user preference stored in LocalStorage
  const stored = Storage.loadTheme();
  if (stored) return stored;

  // Priority 2: OS-level dark mode preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  // Priority 3: Default fallback
  return 'light';
}

/**
 * Apply a theme to the application and persist the preference.
 *
 * Steps:
 *  1. Update AppState.theme (in-memory single source of truth).
 *  2. Set `data-theme` attribute on <body> — this triggers CSS custom property
 *     cascade, updating all themed elements within one paint cycle (< 200ms).
 *  3. Persist the choice to LocalStorage via Storage.saveTheme().
 *  4. Update the theme toggle button icon to reflect the now-active theme.
 *
 * @param {'light'|'dark'} theme - The theme to activate.
 */
function setTheme(theme) {
  // Step 1: Update in-memory state
  AppState.theme = theme;

  // Step 2: Apply to DOM — CSS variables cascade from [data-theme] on <body>
  document.body.setAttribute('data-theme', theme);

  // Step 3: Persist user preference (gracefully handled inside saveTheme)
  Storage.saveTheme(theme);

  // Step 4: Sync toggle button icon/label to the active theme
  updateThemeToggleIcon(theme);
}

/**
 * Update the #theme-toggle button to reflect the currently active theme.
 *
 * Icon convention:
 *  - Dark mode active  → show ☀️  (sun) to indicate "click to switch to light"
 *  - Light mode active → show 🌙 (moon) to indicate "click to switch to dark"
 *
 * Both textContent and aria-label are updated for accessibility (Req 7.1, 7.3).
 *
 * @param {'light'|'dark'} theme - The theme that is currently active.
 */
function updateThemeToggleIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  if (theme === 'dark') {
    // Dark is active — offer to switch to light
    btn.textContent = '☀️';
    btn.setAttribute('aria-label', 'Ganti ke mode terang');
  } else {
    // Light is active (or any unknown value) — offer to switch to dark
    btn.textContent = '🌙';
    btn.setAttribute('aria-label', 'Ganti ke mode gelap');
  }
}

// =============================================================================
// SECTION 10: Event Listeners
// =============================================================================

/**
 * Attach all primary UI event listeners.
 *
 * Called once by init() after the DOM is ready. Does NOT call itself.
 *
 * Listeners attached:
 *  1. Form submit on #transaction-form
 *     - Prevents default page reload.
 *     - Clears existing field errors.
 *     - Reads current values from #item-name, #amount, and #category.
 *     - Delegates to addTransaction() which handles validation, state update,
 *       storage, rendering, and focusing the first invalid field on error.
 *
 *  2. Click delegation on #transaction-list
 *     - Uses closest('[data-id]') to handle clicks on any descendant of a
 *       delete button that carries a data-id attribute.
 *     - Delegates to deleteTransaction(id) with the found ID.
 *
 * Requirements: 1.3, 1.4, 1.5, 1.6, 2.4
 */
function attachFormListeners() {
  // --- 1. Form submit listener ---
  var form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // Clear previous field-level errors before re-validating
      clearFieldErrors();

      // Read current field values
      var name     = document.getElementById('item-name').value;
      var amount   = document.getElementById('amount').value;
      var category = document.getElementById('category').value;

      // addTransaction handles: validation, showFieldError, focus on first
      // error field, state mutation, storage, and render().
      addTransaction(name, amount, category);
    });
  }

  // --- 2. Delete delegation listener ---
  var list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', function (e) {
      // Walk up from the click target to find the nearest element with data-id
      var btn = e.target.closest('[data-id]');
      if (btn) {
        var id = btn.getAttribute('data-id');
        deleteTransaction(id);
      }
    });
  }
}

/**
 * Attach event listeners for theme toggle, tab navigation, and add category.
 *
 * Called once by init() after the DOM is ready. Does NOT call itself.
 *
 * Listeners attached:
 *  1. Click on #theme-toggle
 *     - Toggles between 'light' and 'dark' theme.
 *     - Calls setTheme() to apply and persist the new theme.
 *     - Calls renderChart() to update legend/label colors for the new theme.
 *
 *  2. Click delegation on #tab-nav
 *     - Finds the clicked [data-tab] button via closest().
 *     - Removes 'active' class from all tab buttons, adds it to the clicked one.
 *     - Tab "main"    → shows #list-section + #chart-section, hides #monthly-summary.
 *     - Tab "monthly" → hides #list-section + #chart-section, shows #monthly-summary.
 *
 *  3. Click on #add-category-btn
 *     - Reads the value of #custom-category-input.
 *     - Delegates to addCustomCategory() which handles validation, state
 *       update, storage, dropdown rebuild, and limit checking.
 *
 * Requirements: 5.1, 6.1, 7.1, 7.2
 */
function attachThemeAndNavListeners() {
  // --- 1. Theme toggle listener ---
  var themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
      renderChart(); // re-render to update legend/label colors
    });
  }

  // --- 2. Tab navigation listener (event delegation on #tab-nav) ---
  var tabNav = document.getElementById('tab-nav');
  if (tabNav) {
    tabNav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab]');
      if (!btn) return;

      var tab = btn.getAttribute('data-tab');

      // Update active class + aria-selected on all tab buttons
      document.querySelectorAll('#tab-nav [data-tab]').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Toggle section visibility based on selected tab
      var listSection    = document.getElementById('list-section');
      var chartSection   = document.getElementById('chart-section');
      var monthlySummary = document.getElementById('monthly-summary');

      if (tab === 'main') {
        if (listSection)    listSection.hidden    = false;
        if (chartSection)   chartSection.hidden   = false;
        if (monthlySummary) monthlySummary.hidden = true;
      } else if (tab === 'monthly') {
        if (listSection)    listSection.hidden    = true;
        if (chartSection)   chartSection.hidden   = true;
        if (monthlySummary) monthlySummary.hidden = false;
      }
    });
  }

  // --- 3. Add category button listener ---
  var addCatBtn = document.getElementById('add-category-btn');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', function () {
      var input = document.getElementById('custom-category-input');
      addCustomCategory(input ? input.value : '');
    });
  }
}

// =============================================================================
// SECTION 6 (continued): Rendering Helpers & Transaction List
// =============================================================================

/**
 * Show a validation error message below a form field.
 *
 * - Looks for an element with id `${fieldId}-error` and sets its textContent.
 * - If message is empty/falsy, clears the error text.
 * - Adds the `error-visible` class when showing, removes it when clearing.
 *
 * @param {string} fieldId - The base field id (e.g. "item-name", "amount", "category")
 * @param {string} message - Error message text, or '' to clear
 */
function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(fieldId + '-error');
  if (!errorEl) return;

  if (message) {
    errorEl.textContent = message;
    errorEl.classList.add('error-visible');
  } else {
    errorEl.textContent = '';
    errorEl.classList.remove('error-visible');
  }
}

/**
 * Clear all field-level validation error messages on the transaction form
 * and the custom category field.
 */
function clearFieldErrors() {
  ['item-name', 'amount', 'category', 'custom-category'].forEach(function (fieldId) {
    showFieldError(fieldId, '');
  });
}

/**
 * Rebuild the <ul id="transaction-list"> from AppState.transactions.
 *
 * - Each item renders: name | formatted amount | category | delete button.
 * - When the list is empty, shows an empty-state paragraph.
 * - Uses event delegation — no inline onclick handlers on individual items.
 *   (The delete click listener is attached once in attachFormListeners().)
 */
function renderTransactionList() {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  if (AppState.transactions.length === 0) {
    list.innerHTML = '<li class="empty-state">Belum ada transaksi. Tambahkan transaksi baru di atas.</li>';
    return;
  }

  const html = AppState.transactions.map(function (t) {
    const safeName     = t.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeCategory = t.category.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return (
      '<li class="transaction-item" data-id="' + t.id + '">' +
        '<span class="transaction-name">'     + safeName      + '</span>' +
        '<span class="transaction-amount">'   + formatCurrency(t.amount) + '</span>' +
        '<span class="transaction-category">' + safeCategory  + '</span>' +
        '<button type="button" class="transaction-delete" data-id="' + t.id + '" aria-label="Hapus transaksi ' + safeName + '">🗑 Hapus</button>' +
      '</li>'
    );
  }).join('');

  list.innerHTML = html;
}

/**
 * Master render orchestrator.
 *
 * Called after every state mutation. Rebuilds all dynamic UI regions from
 * the current AppState. Wrapped in try/catch so a rendering failure in one
 * sub-function does not crash the others.
 */
function render() {
  try { renderBalanceDisplay();    } catch (e) { console.error('renderBalanceDisplay failed', e); }
  try { renderTransactionList();   } catch (e) { console.error('renderTransactionList failed', e); }
  try { renderCategoryDropdown();  } catch (e) { console.error('renderCategoryDropdown failed', e); }
  try { renderChart();             } catch (e) { console.error('renderChart failed', e); }
  try { renderMonthlySummary();    } catch (e) { console.error('renderMonthlySummary failed', e); }
}

// =============================================================================
// SECTION 10: CDN Failure Detection
// =============================================================================

/**
 * Detect whether Chart.js failed to load from CDN and show a fallback message.
 *
 * Registers a `window load` listener with a 5-second delay. If Chart is still
 * undefined after that time (CDN unreachable or blocked), replaces the entire
 * #chart-section content with a human-readable error message.
 *
 * Called from init() after render() so the normal chart path has already run.
 * Requirement 9.5.
 */
function detectChartJSFailure() {
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (typeof Chart === 'undefined') {
        var section = document.getElementById('chart-section');
        if (section) {
          section.innerHTML =
            '<p class="chart-unavailable">Grafik tidak tersedia. Periksa koneksi internet Anda.</p>';
        }
      }
    }, 5000);
  });
}

// =============================================================================
// SECTION 11: Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', function init() {
  // ── Step 1: Storage availability check ───────────────────────────────────
  // Must run before any LocalStorage access so callers can rely on the banner.
  if (!Storage.isAvailable()) {
    const banner = document.createElement('div');
    banner.id = 'storage-unavailable-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = 'background:#f59e0b;color:#fff;padding:8px;text-align:center;font-weight:bold;';
    banner.textContent = '⚠ Data tidak akan disimpan secara permanen di sesi ini.';
    document.body.insertBefore(banner, document.body.firstChild);
  }

  // ── Step 2: Detect and apply theme (before first render — avoid FOUC) ────
  const theme = detectInitialTheme();
  setTheme(theme);

  // ── Step 3: Load transactions from LocalStorage → AppState ───────────────
  AppState.transactions = Storage.loadTransactions();

  // ── Step 4: Load and merge categories ────────────────────────────────────
  // Merge DEFAULT_CATEGORIES with any custom categories, sorted alphabetically.
  const customCats = Storage.loadCustomCategories();
  AppState.categories = [].concat(DEFAULT_CATEGORIES, customCats).sort(function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });

  // ── Step 5: Attach event listeners ──────────────────────────────────────
  if (typeof attachFormListeners         === 'function') attachFormListeners();
  if (typeof attachThemeAndNavListeners  === 'function') attachThemeAndNavListeners();

  // ── Step 6: Initial render ───────────────────────────────────────────────
  render();

  // ── Step 7: CDN failure detection (delegated to later task) ──────────────
  if (typeof detectChartJSFailure === 'function') detectChartJSFailure();
});

// =============================================================================
// SECTION 11: Notification / Toast
// =============================================================================

/** Module-level flag: show corrupt data notification only once per session. */
let corruptDataNotified = false;

/**
 * Create and display a non-blocking toast notification at the bottom-right of
 * the screen. The toast auto-removes itself after `duration` ms with an exit
 * animation.
 *
 * @param {string} message   - The text to display in the toast.
 * @param {'error'|'warning'|'info'} [type='error'] - Controls the background color.
 * @param {number} [duration=5000] - Milliseconds before the toast disappears.
 */
function showToast(message, type, duration) {
  if (type === undefined) type = 'error';
  if (duration === undefined) duration = 5000;

  // Guard: DOM may not be ready (e.g. called during module evaluation)
  if (!document.body) return;

  // Build the toast element
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  // Accessibility: announce to screen readers
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  document.body.appendChild(toast);

  // After `duration` ms, play the exit animation then remove the element
  setTimeout(function () {
    toast.classList.add('toast-exit');
    // Wait for the 0.3s exit animation to finish before removing from DOM
    setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * Display a storage-failure toast that includes the failing operation context.
 * Called by Storage.save* methods when a write to LocalStorage throws.
 *
 * @param {string} context - Name of the operation that failed (e.g. 'addTransaction').
 */
function showStorageError(context) {
  showToast(
    'Gagal menyimpan data: ' + context + '. Perubahan tidak akan tersimpan secara permanen.',
    'error'
  );
}

/**
 * Display a one-time warning toast informing the user that previously stored
 * data could not be loaded and has been reset to an empty state.
 *
 * Subsequent calls within the same session are silently ignored.
 */
function showCorruptDataNotification() {
  if (corruptDataNotified) return;
  corruptDataNotified = true;
  showToast('Data sebelumnya tidak dapat dimuat dan telah direset.', 'warning', 8000);
}
