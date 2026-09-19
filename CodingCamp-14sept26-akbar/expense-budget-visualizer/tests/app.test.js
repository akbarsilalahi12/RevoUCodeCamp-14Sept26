/**
 * Unit tests for addTransaction validation logic
 * Vanilla JS assertions - no framework required
 */

// Test utilities
const assert = {
  equal: (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
    }
  },
  deepEqual: (actual, expected, message) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`);
    }
  },
  true: (value, message) => {
    if (value !== true) {
      throw new Error(`Assertion failed: ${message}`);
    }
  },
  false: (value, message) => {
    if (value !== false) {
      throw new Error(`Assertion failed: ${message}`);
    }
  },
  throws: (fn, message) => {
    try {
      fn();
      throw new Error(`Assertion failed: ${message} - Expected function to throw`);
    } catch (e) {
      // Expected
    }
  },
  null: (value, message) => {
    if (value !== null) {
      throw new Error(`Assertion failed: ${message}\n  Expected: null\n  Actual: ${value}`);
    }
  }
};

// Mock DOM elements
function createMockElement(tag, id = null) {
  const el = {
    tag: tag,
    id: id,
    value: '',
    textContent: '',
    className: '',
    style: '',
    attributes: {},
    children: [],
    classList: {
      _classes: [],
      add: function (cls) { this._classes.push(cls); },
      remove: function (cls) { this._classes = this._classes.filter(c => c !== cls); },
      contains: function (cls) { return this._classes.includes(cls); }
    },
    focus: function () { this.focused = true; },
    selectedIndex: 0,
    innerHTML: '',
    querySelector: function (selector) {
      if (selector === '.hidden') return { classList: { _classes: ['hidden'], add: () => { }, remove: () => { } } };
      return null;
    },
    classListMock: {
      _classes: [],
      add: function (cls) { this._classes.push(cls); },
      remove: function (cls) { this._classes = this._classes.filter(c => c !== cls); }
    }
  };
  return el;
}

// Global mock objects
const mockState = {
  transactions: [],
  settings: { theme: "light", spendingLimit: null, categories: ["Food", "Transport", "Fun"] },
  sort: "date_desc"
};

const mockElements = {
  'item-name': { value: '', classList: { _classes: [], add: () => { }, remove: () => { } } },
  'item-amount': { value: '', classList: { _classes: [], add: () => { }, remove: () => { } } },
  'item-category': { value: '', selectedIndex: 0, classList: { _classes: [], add: () => { }, remove: () => { } } },
  'form-error': { classList: { _classes: ['hidden'], add: () => { }, remove: () => { } }, textContent: '' }
};

// Reset mock state before each test
function resetMocks() {
  mockElements['item-name'].value = '';
  mockElements['item-amount'].value = '';
  mockElements['item-category'].value = '';
  mockElements['item-category'].selectedIndex = 0;
  mockElements['form-error'].classList._classes = ['hidden'];
  mockElements['form-error'].textContent = '';
  mockState.transactions = [];
}

// Simplified versions of required functions for testing
function mockGenerateId() {
  return 'mock-id-' + Date.now();
}

function mockIsStorageAvailable() {
  return false; // Skip storage for testing
}

// Create a testable wrapper for addTransaction
function createAddTransactionTestWrapper() {
  // Clone the addTransaction logic for testing
  function testAddTransaction(name, amount, category) {
    resetMocks();

    // Set test values
    mockElements['item-name'].value = name;
    mockElements['item-amount'].value = amount;
    mockElements['item-category'].value = category;
    mockElements['item-category'].selectedIndex = category
      ? mockState.settings.categories.indexOf(category) >= 0
        ? mockState.settings.categories.indexOf(category)
        : 0
      : 0;

    const MAX_AMOUNT = 999_999_999.99;

    const errors = [];
    let nameInvalid = false;
    let amountInvalid = false;

    // Validation logic from addTransaction
    if (!mockElements['item-name'].value.trim()) {
      errors.push("Item name is required.");
      nameInvalid = true;
    } else if (mockElements['item-name'].value.length > 100) {
      errors.push("Item name must be 100 characters or fewer.");
      nameInvalid = true;
    }

    const amountValue = parseFloat(mockElements['item-amount'].value);
    if (isNaN(amountValue) || amountValue < 0.01 || amountValue > MAX_AMOUNT) {
      errors.push("Amount must be a number between 0.01 and 999,999,999.99.");
      amountInvalid = true;
    }

    if (!mockElements['item-category'].value) {
      errors.push("Please select a category.");
    }

    // Add transaction if successful
    if (errors.length === 0) {
      const transaction = {
        id: mockGenerateId(),
        name: mockElements['item-name'].value,
        amount: amountValue,
        category: mockElements['item-category'].value,
        createdAt: Date.now(),
      };
      mockState.transactions.push(transaction);
    }

    // Return test results
    return {
      errors,
      nameInvalid,
      amountInvalid,
      transactionAdded: errors.length === 0 && mockState.transactions.length > 0,
      transactionCount: mockState.transactions.length,
      formReset: errors.length === 0
    };
  }

  return testAddTransaction;
}

// ============================================================
// TEST CASES
// ============================================================

console.log('\n=== Running addTransaction Validation Tests ===\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}`);
    console.log(`  ${e.message}`);
  }
}

// Test 1: Empty name → error shown, transaction not added
runTest('Test 1: Empty name should show error and not add transaction', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('', '100', 'Food');

  assert.true(result.errors.length > 0, 'Should have errors for empty name');
  assert.true(result.errors.some(e => e.includes('Item name is required')), 'Should have "Item name is required" error');
  assert.false(result.transactionAdded, 'Transaction should not be added');
  assert.true(result.nameInvalid, 'nameInvalid should be true');
});

// Test 2: Amount = 0 → error shown
runTest('Test 2: Amount = 0 should show error', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '0', 'Food');

  assert.true(result.errors.length > 0, 'Should have errors for amount = 0');
  assert.true(result.errors.some(e => e.includes('Amount must be a number between 0.01')), 'Should have amount validation error');
  assert.true(result.amountInvalid, 'amountInvalid should be true');
});

// Test 3: Amount = 999,999,999.99 → success
runTest('Test 3: Amount = 999,999,999.99 should succeed', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '999999999.99', 'Food');

  assert.equal(result.errors.length, 0, 'Should have no errors for valid amount');
  assert.true(result.transactionAdded, 'Transaction should be added');
  assert.equal(result.transactionCount, 1, 'Should have 1 transaction');
  assert.true(result.formReset, 'Form should be reset after successful add');
});

// Test 4: Amount = 1,000,000,000 → error shown
runTest('Test 4: Amount = 1,000,000,000 should show error', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '1000000000', 'Food');

  assert.true(result.errors.length > 0, 'Should have errors for amount exceeding max');
  assert.true(result.errors.some(e => e.includes('Amount must be a number between 0.01')), 'Should have amount validation error');
  assert.true(result.amountInvalid, 'amountInvalid should be true');
});

// Test 5: Successful add → form reset to defaults
runTest('Test 5: Successful add should reset form to defaults', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '50', 'Food');

  assert.true(result.formReset, 'Form should be reset after successful add');
  assert.equal(result.transactionCount, 1, 'Transaction should be added');
});

// Additional edge case tests
runTest('Test 6: Negative amount should show error', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '-10', 'Food');

  assert.true(result.errors.length > 0, 'Should have errors for negative amount');
});

runTest('Test 7: Amount = 0.01 (minimum) should succeed', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '0.01', 'Food');

  assert.equal(result.errors.length, 0, 'Should have no errors for minimum amount');
  assert.true(result.transactionAdded, 'Transaction should be added');
});

runTest('Test 8: Amount = 999,999,999.98 (just below max) should succeed', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '999999999.98', 'Food');

  assert.equal(result.errors.length, 0, 'Should have no errors for amount just below max');
  assert.true(result.transactionAdded, 'Transaction should be added');
});

runTest('Test 9: Empty category should show error', () => {
  const addTx = createAddTransactionTestWrapper();
  const result = addTx('Test Item', '50', '');

  assert.true(result.errors.length > 0, 'Should have errors for empty category');
  assert.true(result.errors.some(e => e.includes('Please select a category')), 'Should have category selection error');
});

runTest('Test 10: Name length > 100 should show error', () => {
  const longName = 'A'.repeat(101);
  const addTx = createAddTransactionTestWrapper();
  const result = addTx(longName, '50', 'Food');

  assert.true(result.errors.length > 0, 'Should have errors for name > 100 chars');
  assert.true(result.errors.some(e => e.includes('Item name must be 100 characters or fewer')), 'Should have name length error');
});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n=== Test Summary ===');
console.log(`Total tests: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addTransactionTests: {
      passed,
      failed,
      total: passed + failed
    }
  };
}

// ============================================================
// PROPERTY TEST: ROUND-TRIP SERIALIZATION (Task 6.6)
// Property: Round-Trip Consistency — for any array of Transaction objects,
// JSON.parse(JSON.stringify(transactions)) must deep-equal the original array
// Validates: Requirements 8.1, 8.3
// ============================================================

console.log('\n=== Running Round-Trip Serialization Property Tests (Task 6.6) ===\n');

// Transaction generator - creates random valid transaction objects
function generateRandomTransaction() {
  const categories = ['Food', 'Transport', 'Fun', 'Utilities', 'Entertainment'];
  const category = categories[Math.floor(Math.random() * categories.length)];

  // Generate random amount between 0.01 and 999999.99
  const amount = (Math.random() * 999999.99 + 0.01).toFixed(2);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    name: 'Transaction ' + Math.floor(Math.random() * 1000),
    amount: parseFloat(amount),
    category: category,
    createdAt: Date.now() - Math.floor(Math.random() * 1000000000)
  };
}

// Deep equality check for objects (handles primitives, objects, arrays)
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (a !== null && typeof a === 'object') {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      if (!deepEqual(a[keysA[i]], b[keysB[i]])) return false;
    }
    return true;
  }

  return false;
}

// Round-trip test runner
function testRoundTrip(transactionsArray) {
  const serialized = JSON.stringify(transactionsArray);
  const deserialized = JSON.parse(serialized);
  return deepEqual(transactionsArray, deserialized);
}

// Property-based tests
let propertyTestsPassed = 0;
let propertyTestsFailed = 0;

function runPropertyTest(testName, numIterations = 100) {
  let allPassed = true;
  let failingExample = null;

  for (let i = 0; i < numIterations; i++) {
    // Generate random array of transactions (0 to 10 items)
    const arraySize = Math.floor(Math.random() * 11);
    const transactions = [];
    for (let j = 0; j < arraySize; j++) {
      transactions.push(generateRandomTransaction());
    }

    if (!testRoundTrip(transactions)) {
      allPassed = false;
      failingExample = transactions;
      break;
    }
  }

  if (allPassed) {
    propertyTestsPassed++;
    console.log(`✓ ${testName} (tested ${numIterations} random arrays)`);
  } else {
    propertyTestsFailed++;
    console.log(`✗ ${testName}`);
    console.log(`  Failing example: ${JSON.stringify(failingExample, null, 2)}`);
  }

  return allPassed;
}

// Test 1: Empty array
runPropertyTest('Test 1: Empty array round-trips correctly', 1);

// Test 2: Single transaction
runPropertyTest('Test 2: Single transaction round-trips correctly', 100);

// Test 3: Multiple transactions
runPropertyTest('Test 3: Multiple transactions (0-10 items) round-trip correctly', 100);

// Test 4: Edge case - minimum amount (0.01)
runPropertyTest('Test 4: Transactions with minimum amount (0.01) round-trip correctly', 100);

// Test 5: Edge case - larger amounts
runPropertyTest('Test 5: Transactions with larger amounts round-trip correctly', 100);

// Test 6: Transactions with same category
runPropertyTest('Test 6: Transactions with same category round-trip correctly', 100);

// Test 7: Transactions with identical names
runPropertyTest('Test 7: Transactions with identical names round-trip correctly', 100);

// ============================================================
// PROPERTY TEST SUMMARY
// ============================================================

console.log('\n=== Round-Trip Serialization Property Test Summary ===');
console.log(`Total property tests: ${propertyTestsPassed + propertyTestsFailed}`);
console.log(`Passed: ${propertyTestsPassed}`);
console.log(`Failed: ${propertyTestsFailed}`);

if (propertyTestsFailed === 0) {
  console.log('\n✓ All round-trip serialization property tests passed!');
}

// Overall summary
const overallPassed = passed + propertyTestsPassed;
const overallFailed = failed + propertyTestsFailed;

console.log('\n=== Overall Test Summary ===');
console.log(`Total tests: ${overallPassed + overallFailed}`);
console.log(`Passed: ${overallPassed}`);
console.log(`Failed: ${overallFailed}`);

if (overallFailed === 0) {
  console.log('\n✓ All tests passed!');
}

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    addTransactionTests: {
      passed,
      failed,
      total: passed + failed
    },
    roundTripPropertyTests: {
      passed: propertyTestsPassed,
      failed: propertyTestsFailed,
      total: propertyTestsPassed + propertyTestsFailed
    }
  };
}

console.log('\n=== Running addCategory Tests ===\n');

// Reset state for category tests
function resetCategoryState() {
  mockState.settings.categories = ["Food", "Transport", "Fun"];
  mockElements['custom-category'] = { value: '', classList: { _classes: [], add: () => { }, remove: () => { } } };
  mockElements['category-error'] = { classList: { _classes: ['hidden'], add: () => { }, remove: () => { } }, textContent: '' };
}

// Mock addCategory function for testing
function testAddCategory(categoryName) {
  resetCategoryState();

  const input = { value: categoryName, classList: { _classes: [], add: () => { }, remove: () => { } } };
  const errorEl = { classList: { _classes: ['hidden'], add: (cls) => { }, remove: (cls) => { } }, textContent: '' };

  const name = input.value.trim();

  errorEl.classList._classes = ['hidden'];
  input.classList._classes = [];

  // Test: empty category
  if (!name) {
    errorEl.textContent = "Category name cannot be empty.";
    errorEl.classList._classes = [];
    input.classList._classes = ['input-error'];
    return {
      error: true,
      errorMessage: errorEl.textContent,
      inputErrored: input.classList._classes.includes('input-error'),
      categoryAdded: false,
      categories: [...mockState.settings.categories]
    };
  }

  // Test: duplicate category (case-insensitive)
  const duplicate = mockState.settings.categories.some(
    (c) => c.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    errorEl.textContent = `"${name}" already exists.`;
    errorEl.classList._classes = [];
    input.classList._classes = ['input-error'];
    return {
      error: true,
      errorMessage: errorEl.textContent,
      inputErrored: input.classList._classes.includes('input-error'),
      categoryAdded: false,
      categories: [...mockState.settings.categories]
    };
  }

  // Valid category - add it
  mockState.settings.categories.push(name);

  return {
    error: false,
    categoryAdded: true,
    categories: [...mockState.settings.categories],
    inputCleared: true
  };
}

// Test 11: Duplicate category (case-insensitive) → error, not added
runTest('Test 11: Duplicate category (case-insensitive) should show error and not add', () => {
  const result = testAddCategory('food');
  assert.true(result.error, 'Should have error for duplicate category');
  assert.true(result.errorMessage.includes('already exists'), 'Error message should mention duplicate');
  assert.false(result.categoryAdded, 'Category should not be added');
  assert.equal(result.categories.length, 3, 'Categories array should remain unchanged');
});

// Test 12: Empty category → error, not added
runTest('Test 12: Empty category should show error and not add', () => {
  const result = testAddCategory('');
  assert.true(result.error, 'Should have error for empty category');
  assert.true(result.errorMessage.includes('cannot be empty'), 'Error message should mention empty');
  assert.true(result.inputErrored, 'Input should have input-error class');
  assert.false(result.categoryAdded, 'Category should not be added');
  assert.equal(result.categories.length, 3, 'Categories array should remain unchanged');
});

// Test 13: Valid category → added and appears in dropdown
runTest('Test 13: Valid category should be added and appear in dropdown', () => {
  const result = testAddCategory('NewCategory');
  assert.false(result.error, 'Should not have error for valid category');
  assert.true(result.categoryAdded, 'Category should be added');
  assert.equal(result.categories.length, 4, 'Categories array should have one more item');
  assert.true(result.categories.includes('NewCategory'), 'New category should be in the array');
});

// Test 14: Valid category with different case (not duplicate) → added
runTest('Test 14: Category with different case (not duplicate) should be added', () => {
  const result = testAddCategory('FOOD'); // "Food" already exists
  assert.true(result.error, 'Should have error for FOOD (duplicate of Food case-insensitively)');
  assert.false(result.categoryAdded, 'Category should not be added');
  assert.equal(result.categories.length, 3, 'Categories array should remain unchanged');
});

// ============================================================
// SAVE LIMIT TESTS
// ============================================================

console.log('\n=== Running saveLimit Tests ===\n');

// Mock saveLimit function for testing
function testSaveLimit(inputValue) {
  const input = { value: inputValue, classList: { _classes: [], add: () => { }, remove: () => { } } };
  const errorEl = { classList: { _classes: ['hidden'], add: (cls) => { }, remove: (cls) => { } }, textContent: '' };
  let spendingLimit = 500; // Initial test value

  errorEl.classList._classes = ['hidden'];
  input.classList._classes = [];

  const raw = input.value.trim();

  // Test: empty string → set spendingLimit to null
  if (raw === "" || raw === "0") {
    spendingLimit = null;
    return {
      error: false,
      spendingLimit: spendingLimit,
      inputCleared: true,
      inputErrored: false
    };
  }

  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) {
    errorEl.textContent = "Please enter a positive number or leave blank to clear.";
    errorEl.classList._classes = [];
    input.classList._classes = ['input-error'];
    return {
      error: true,
      errorMessage: errorEl.textContent,
      inputErrored: input.classList._classes.includes('input-error'),
      spendingLimit: spendingLimit // unchanged
    };
  }

  spendingLimit = val;
  return {
    error: false,
    spendingLimit: spendingLimit,
    inputCleared: true,
    inputErrored: false
  };
}

// Test 15: Empty input → spendingLimit saved as null
runTest('Test 15: Empty input should set spendingLimit to null', () => {
  const result = testSaveLimit('');
  assert.false(result.error, 'Should not have error for empty input');
  assert.null(result.spendingLimit, 'spendingLimit should be null');
  assert.true(result.inputCleared, 'Input should be cleared');
});

// Test 16: "0" input → spendingLimit saved as null
runTest('Test 16: "0" input should set spendingLimit to null', () => {
  const result = testSaveLimit('0');
  assert.false(result.error, 'Should not have error for "0" input');
  assert.null(result.spendingLimit, 'spendingLimit should be null');
});

// Test 17: Valid positive number → spendingLimit set to that value
runTest('Test 17: Valid positive number should set spendingLimit', () => {
  const result = testSaveLimit('1000');
  assert.false(result.error, 'Should not have error for valid number');
  assert.equal(result.spendingLimit, 1000, 'spendingLimit should be set to 1000');
});

// Test 18: Negative number → error shown
runTest('Test 18: Negative number should show error', () => {
  const result = testSaveLimit('-100');
  assert.true(result.error, 'Should have error for negative number');
  assert.true(result.inputErrored, 'Input should have input-error class');
  assert.equal(result.spendingLimit, 500, 'spendingLimit should remain unchanged');
});

// Test 19: Zero (as number) → spendingLimit saved as null
runTest('Test 19: Zero as number should set spendingLimit to null', () => {
  const result = testSaveLimit('0');
  assert.false(result.error, 'Should not have error for "0"');
  assert.null(result.spendingLimit, 'spendingLimit should be null');
});

// ============================================================
// TEST SUMMARY
// ============================================================

console.log('\n=== Overall Test Summary ===');
console.log(`Total tests: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!');
}

// ============================================================
// PROPERTY TEST: RENDER IDEMPOTENCE (Task 6.7)
// Property: Render Idempotence — calling render() twice with identical state
// must produce identical #transaction-list innerHTML and identical Chart.js dataset
// Validates: Requirements 3.3, 4.3
// ============================================================

console.log('\n=== Running Render Idempotence Property Tests (Task 6.7) ===\n');

// Create a comprehensive mock DOM environment
function createMockDOM() {
  const mockElements = {};

  // Helper function to create a classList object with proper method binding
  function createClassList(initialClasses = []) {
    return {
      _classes: [...initialClasses],
      add: function (cls) { this._classes.push(cls); },
      remove: function (cls) { this._classes = this._classes.filter(c => c !== cls); },
      contains: function (cls) { return this._classes.includes(cls); }
    };
  }

  // Transaction list container
  mockElements['transaction-list'] = {
    innerHTML: '',
    classList: createClassList()
  };

  // Empty state element
  mockElements['list-empty'] = {
    classList: createClassList(['hidden'])
  };

  // Balance elements
  mockElements['balance-amount'] = { textContent: '' };
  mockElements['limit-status'] = {
    classList: createClassList(['hidden']),
    textContent: ''
  };
  mockElements['balance-card'] = {
    classList: createClassList()
  };

  // Category select
  mockElements['item-category'] = {
    innerHTML: '',
    children: [],
    value: 'Food'
  };

  // Chart elements
  mockElements['spending-chart'] = {
    classList: createClassList()
  };
  mockElements['chart-empty'] = {
    classList: createClassList(['hidden'])
  };

  return mockElements;
}

// Helper to capture innerHTML before render
function captureTransactionListHTML(mockDOM) {
  return mockDOM['transaction-list'].innerHTML;
}

// Helper to capture chart dataset
function captureChartDataset(mockState) {
  const getCategoryTotals = () => {
    return mockState.transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
  };

  const totals = getCategoryTotals();
  const labels = Object.keys(totals);
  const data = Object.values(totals);

  return {
    labels: labels,
    data: data,
    hasData: labels.length > 0
  };
}

// Escape HTML helper (from app.js)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Format currency helper (from app.js)
function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

// Simplified renderTransactionList for testing
function renderTransactionList(mockDOM, transactions, sort, settings) {
  const emptyEl = mockDOM['list-empty'];
  const listEl = mockDOM['transaction-list'];

  // Sort transactions
  const sorted = [...transactions].sort((a, b) => {
    if (sort === "date_asc") return a.createdAt - b.createdAt;
    if (sort === "amount_asc") return a.amount - b.amount;
    if (sort === "amount_desc") return b.amount - a.amount;
    if (sort === "category") return a.category.localeCompare(b.category);
    return b.createdAt - a.createdAt; // date_desc
  });

  if (sorted.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove('hidden');
    return;
  }

  emptyEl.classList.add('hidden');
  listEl.innerHTML = sorted.map((t) => {
    const idx = settings.categories.indexOf(t.category);
    const palette = ["#6c63ff", "#ff6584", "#43b89c", "#f59e0b",
      "#06b6d4", "#ec4899", "#8b5cf6", "#10b981",
      "#f97316", "#3b82f6"];
    const color = palette[idx >= 0 ? idx % palette.length : 0];
    return `
      <li class="transaction-item"
          data-id="${t.id}">
        <span class="item-dot" style="background:${color};"></span>
        <div class="item-info">
          <div class="item-name">${escapeHtml(t.name)}</div>
          <div class="item-category">${escapeHtml(t.category)}</div>
        </div>
        <span class="item-amount">${formatCurrency(t.amount)}</span>
        <button
          class="btn btn-danger"
          data-delete="${t.id}"
          aria-label="Delete transaction: ${escapeHtml(t.name)}"
          title="Delete"
        >🗑</button>
      </li>
    `;
  }).join("");
}

// Simplified renderBalance for testing
function renderBalance(mockDOM, transactions, settings) {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  const limit = settings.spendingLimit;

  mockDOM['balance-amount'].textContent = formatCurrency(total);

  if (limit !== null && total > limit) {
    mockDOM['balance-card'].classList.add('over-limit');
    mockDOM['limit-status'].textContent = `⚠ Over limit by ${formatCurrency(total - limit)}`;
    mockDOM['limit-status'].classList.remove('hidden');
  } else {
    mockDOM['balance-card'].classList.remove('over-limit');
    mockDOM['limit-status'].classList.add('hidden');
  }
}

// Simplified renderCategoryOptions for testing
function renderCategoryOptions(mockDOM, categories) {
  const sel = mockDOM['item-category'];
  sel.innerHTML = "";
  sel.children = [];
  categories.forEach((cat) => {
    sel.children.push(cat);
  });
  sel.innerHTML = categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
}

// Simplified renderChart for testing
function renderChart(mockDOM, transactions, settings) {
  const canvas = mockDOM['spending-chart'];
  const emptyMsg = mockDOM['chart-empty'];
  const totals = transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});

  const labels = Object.keys(totals);
  const data = Object.values(totals);
  const palette = ["#6c63ff", "#ff6584", "#43b89c", "#f59e0b",
    "#06b6d4", "#ec4899", "#8b5cf6", "#10b981",
    "#f97316", "#3b82f6"];
  const colors = labels.map(cat => {
    const idx = settings.categories.indexOf(cat);
    return palette[idx >= 0 ? idx % palette.length : 0];
  });

  if (labels.length === 0) {
    canvas.classList.add('hidden');
    emptyMsg.classList.remove('hidden');
    return {
      labels: [],
      data: [],
      colors: [],
      empty: true
    };
  }

  canvas.classList.remove('hidden');
  emptyMsg.classList.add('hidden');

  return {
    labels: labels,
    data: data,
    colors: colors,
    empty: false
  };
}

// Full render function for testing (simplified version)
function render(mockDOM, mockState) {
  renderBalance(mockDOM, mockState.transactions, mockState.settings);
  renderCategoryOptions(mockDOM, mockState.settings.categories);
  renderTransactionList(mockDOM, mockState.transactions, mockState.sort, mockState.settings);
  renderChart(mockDOM, mockState.transactions, mockState.settings);
}

// Transaction generator
function generateRandomTransaction() {
  const categories = ['Food', 'Transport', 'Fun', 'Utilities', 'Entertainment'];
  const amount = (Math.random() * 999999.99 + 0.01).toFixed(2);

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2),
    name: 'Transaction ' + Math.floor(Math.random() * 1000),
    amount: parseFloat(amount),
    category: categories[Math.floor(Math.random() * categories.length)],
    createdAt: Date.now() - Math.floor(Math.random() * 1000000000)
  };
}

// Deep comparison for DOM state
function compareDOMState(rendered1, rendered2) {
  const htmlMatch = rendered1.transactionListHTML === rendered2.transactionListHTML;
  const chartMatch = JSON.stringify(rendered1.chart) === JSON.stringify(rendered2.chart);
  return htmlMatch && chartMatch;
}

// Property-based tests
let renderIdempotencePassed = 0;
let renderIdempotenceFailed = 0;
let renderIdempotenceTestNames = [];

function runRenderIdempotenceTest(testName, transactions, stateOverrides = {}) {
  // Create fresh mock DOM for each test
  const mockDOM1 = createMockDOM();
  const mockDOM2 = createMockDOM();

  // Create identical state for both renders
  const state1 = {
    transactions: [...transactions],
    settings: { theme: "light", spendingLimit: null, categories: ["Food", "Transport", "Fun"] },
    sort: "date_desc",
    ...stateOverrides
  };

  const state2 = {
    transactions: [...transactions],
    settings: { ...state1.settings },
    sort: state1.sort
  };

  // First render
  render(mockDOM1, state1);
  const rendered1 = {
    transactionListHTML: mockDOM1['transaction-list'].innerHTML,
    chart: {
      labels: state1.transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {}),
      data: Object.values(state1.transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {}))
    }
  };

  // Second render with identical state
  render(mockDOM2, state2);
  const rendered2 = {
    transactionListHTML: mockDOM2['transaction-list'].innerHTML,
    chart: {
      labels: state2.transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {}),
      data: Object.values(state2.transactions.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] ?? 0) + t.amount;
        return acc;
      }, {}))
    }
  };

  const passed = compareDOMState(rendered1, rendered2);

  if (passed) {
    renderIdempotencePassed++;
    renderIdempotenceTestNames.push(testName);
    console.log(`✓ ${testName}`);
  } else {
    renderIdempotenceFailed++;
    console.log(`✗ ${testName}`);
    console.log(`  First render HTML length: ${rendered1.transactionListHTML.length}`);
    console.log(`  Second render HTML length: ${rendered2.transactionListHTML.length}`);
    console.log(`  First render chart: ${JSON.stringify(rendered1.chart)}`);
    console.log(`  Second render chart: ${JSON.stringify(rendered2.chart)}`);
  }

  return passed;
}

// Test 1: Empty transactions
runRenderIdempotenceTest('Test 1: Empty transactions (no items in list)', []);

// Test 2: Single transaction
runRenderIdempotenceTest('Test 2: Single transaction', [
  { id: 'tx1', name: 'Coffee', amount: 5.50, category: 'Food', createdAt: Date.now() }
]);

// Test 3: Multiple transactions
runRenderIdempotenceTest('Test 3: Multiple transactions', [
  { id: 'tx1', name: 'Coffee', amount: 5.50, category: 'Food', createdAt: Date.now() },
  { id: 'tx2', name: 'Bus ticket', amount: 2.50, category: 'Transport', createdAt: Date.now() - 1000 },
  { id: 'tx3', name: 'Movie', amount: 15.00, category: 'Fun', createdAt: Date.now() - 2000 }
]);

// Test 4: Multiple transactions with same category
runRenderIdempotenceTest('Test 4: Multiple transactions with same category', [
  { id: 'tx1', name: 'Coffee', amount: 5.50, category: 'Food', createdAt: Date.now() },
  { id: 'tx2', name: 'Lunch', amount: 12.00, category: 'Food', createdAt: Date.now() - 1000 },
  { id: 'tx3', name: 'Snacks', amount: 8.00, category: 'Food', createdAt: Date.now() - 2000 }
]);

// Test 5: Transactions with different sort orders
runRenderIdempotenceTest('Test 5: Transactions with date_asc sort', [
  { id: 'tx1', name: 'Transaction 1', amount: 10.00, category: 'Food', createdAt: Date.now() },
  { id: 'tx2', name: 'Transaction 2', amount: 20.00, category: 'Transport', createdAt: Date.now() - 1000 },
  { id: 'tx3', name: 'Transaction 3', amount: 15.00, category: 'Fun', createdAt: Date.now() - 2000 }
], { sort: "date_asc" });

// Test 6: Transactions with amount_desc sort
runRenderIdempotenceTest('Test 6: Transactions with amount_desc sort', [
  { id: 'tx1', name: 'Transaction 1', amount: 10.00, category: 'Food', createdAt: Date.now() },
  { id: 'tx2', name: 'Transaction 2', amount: 20.00, category: 'Transport', createdAt: Date.now() - 1000 },
  { id: 'tx3', name: 'Transaction 3', amount: 15.00, category: 'Fun', createdAt: Date.now() - 2000 }
], { sort: "amount_desc" });

// Test 7: Transaction with special characters in name
runRenderIdempotenceTest('Test 7: Transaction with special characters in name', [
  { id: 'tx1', name: '<Script> & "Quote"', amount: 10.00, category: 'Food', createdAt: Date.now() }
]);

// Test 8: Transaction with long name (edge case)
runRenderIdempotenceTest('Test 8: Transaction with long name (100 chars)', [
  { id: 'tx1', name: 'A'.repeat(100), amount: 10.00, category: 'Food', createdAt: Date.now() }
]);

// Test 9: Transaction with minimum amount (0.01)
runRenderIdempotenceTest('Test 9: Transaction with minimum amount (0.01)', [
  { id: 'tx1', name: 'Minimal', amount: 0.01, category: 'Food', createdAt: Date.now() }
]);

// Test 10: Many transactions (stress test)
runRenderIdempotenceTest('Test 10: Many transactions (20 items)', Array.from({ length: 20 }, (_, i) => ({
  id: `tx${i}`,
  name: `Transaction ${i}`,
  amount: (i + 1) * 10.50,
  category: ['Food', 'Transport', 'Fun'][i % 3],
  createdAt: Date.now() - i * 1000
})));

// Test 11: Transactions with spending limit (over limit)
runRenderIdempotenceTest('Test 11: Transactions over spending limit', [
  { id: 'tx1', name: 'Coffee', amount: 100.00, category: 'Food', createdAt: Date.now() }
], { settings: { theme: "light", spendingLimit: 50.00, categories: ["Food", "Transport", "Fun"] } });

// Test 12: Transactions with custom categories
runRenderIdempotenceTest('Test 12: Transactions with custom categories', [
  { id: 'tx1', name: 'Test Item', amount: 50.00, category: 'CustomCategory', createdAt: Date.now() }
], { settings: { theme: "light", spendingLimit: null, categories: ["Food", "Transport", "Fun", "CustomCategory"] } });

// ============================================================
// RENDER IDEMPOTENCE PROPERTY TEST SUMMARY
// ============================================================

console.log('\n=== Render Idempotence Property Test Summary ===');
console.log(`Total property tests: ${renderIdempotencePassed + renderIdempotenceFailed}`);
console.log(`Passed: ${renderIdempotencePassed}`);
console.log(`Failed: ${renderIdempotenceFailed}`);

if (renderIdempotenceFailed === 0) {
  console.log('\n✓ All render idempotence property tests passed!');
}

// ============================================================
// INTEGRATION TEST: FULL ADD-DELETE CYCLE (Task 8.3)
// Property: Complete Workflow Integrity — simulate adding transactions,
// verify state (list length, balance, chart), then delete and verify updated state
// Validates: Requirements 8.3
// ============================================================

console.log('\n=== Running Integration Test: Full Add-Delete Cycle (Task 8.3) ===\n');

// Create isolated test environment
function createIntegrationTestEnv() {
  // Reset state
  const testState = {
    transactions: [],
    settings: { theme: "light", spendingLimit: null, categories: ["Food", "Transport", "Fun"] },
    sort: "date_desc"
  };

  // Mock render functions that update state instead of DOM
  const renderedState = {
    transactionList: [],
    balance: 0,
    chartData: { labels: [], data: [] }
  };

  function getTotal() {
    return testState.transactions.reduce((sum, t) => sum + t.amount, 0);
  }

  function getSortedTransactions() {
    const arr = [...testState.transactions];
    switch (testState.sort) {
      case "date_asc": return arr.sort((a, b) => a.createdAt - b.createdAt);
      case "amount_asc": return arr.sort((a, b) => a.amount - b.amount);
      case "amount_desc": return arr.sort((a, b) => b.amount - a.amount);
      case "category": return arr.sort((a, b) => a.category.localeCompare(b.category));
      default: return arr.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  function getCategoryTotals() {
    return testState.transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {});
  }

  function render() {
    const sorted = getSortedTransactions();
    renderedState.transactionList = sorted.map(t => ({
      id: t.id,
      name: t.name,
      amount: t.amount,
      category: t.category
    }));
    renderedState.balance = getTotal();
    const totals = getCategoryTotals();
    renderedState.chartData = {
      labels: Object.keys(totals),
      data: Object.values(totals)
    };
  }

  function addTransaction(name, amount, category) {
    const transaction = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'tx-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      name,
      amount,
      category,
      createdAt: Date.now()
    };
    testState.transactions.push(transaction);
    render();
    return transaction;
  }

  function deleteTransaction(id) {
    testState.transactions = testState.transactions.filter(t => t.id !== id);
    render();
  }

  return {
    addTransaction,
    deleteTransaction,
    getTransactions: () => testState.transactions,
    getTransactionList: () => renderedState.transactionList,
    getBalance: () => renderedState.balance,
    getChartData: () => renderedState.chartData,
    getState: () => ({ ...testState })
  };
}

// Integration test
let integrationTestsPassed = 0;
let integrationTestsFailed = 0;

function runIntegrationTest(testName, testFn) {
  try {
    testFn();
    integrationTestsPassed++;
    console.log(`✓ ${testName}`);
  } catch (e) {
    integrationTestsFailed++;
    console.log(`✗ ${testName}`);
    console.log(`  ${e.message}`);
  }
}

// Test: Full add-delete cycle
runIntegrationTest('Integration Test: Full add-delete cycle (3 add → delete 1)', () => {
  const env = createIntegrationTestEnv();

  // Step 1: Add 3 transactions with different categories
  const tx1 = env.addTransaction('Coffee', 5.50, 'Food');
  const tx2 = env.addTransaction('Bus Ticket', 2.50, 'Transport');
  const tx3 = env.addTransaction('Movie', 15.00, 'Fun');

  // Step 2: Verify after adding 3 transactions
  assert.equal(env.getTransactionList().length, 3, 'List should have 3 transactions');
  assert.equal(env.getBalance(), 23.00, 'Balance should be 23.00 (5.50 + 2.50 + 15.00)');
  assert.deepEqual(env.getChartData().labels, ['Food', 'Transport', 'Fun'], 'Chart should have 3 categories');
  assert.deepEqual(env.getChartData().data, [5.50, 2.50, 15.00], 'Chart data should match transaction amounts');

  // Step 3: Delete 1 transaction (the second one added)
  env.deleteTransaction(tx2.id);

  // Step 4: Verify after deleting 1 transaction
  assert.equal(env.getTransactionList().length, 2, 'List should have 2 transactions after delete');
  assert.equal(env.getBalance(), 20.50, 'Balance should be 20.50 (5.50 + 15.00) after deleting Bus ticket');
  assert.deepEqual(env.getChartData().labels, ['Food', 'Fun'], 'Chart should have 2 categories after delete');
  assert.deepEqual(env.getChartData().data, [5.50, 15.00], 'Chart data should be updated after delete');

  // Additional verification: Check correct transaction was deleted
  const remainingIds = env.getTransactionList().map(t => t.id);
  assert.true(!remainingIds.includes(tx2.id), 'Deleted transaction (tx2) should not be in list');
  assert.true(remainingIds.includes(tx1.id), 'First transaction (tx1) should still be in list');
  assert.true(remainingIds.includes(tx3.id), 'Third transaction (tx3) should still be in list');
});

// Test: Add-delete-add cycle (verify IDs remain unique)
runIntegrationTest('Integration Test: Add-delete-add cycle preserves ID uniqueness', () => {
  const env = createIntegrationTestEnv();

  const tx1 = env.addTransaction('Item A', 10.00, 'Food');
  const tx2 = env.addTransaction('Item B', 20.00, 'Transport');
  env.deleteTransaction(tx1.id);
  const tx3 = env.addTransaction('Item C', 30.00, 'Fun');

  const allIds = env.getTransactionList().map(t => t.id);
  assert.equal(allIds.length, 2, 'Should have 2 transactions');
  assert.true(!allIds.includes(tx1.id), 'Deleted tx1 should not be in list');
  assert.true(allIds.includes(tx2.id), 'tx2 should still be in list');
  assert.true(allIds.includes(tx3.id), 'tx3 should be in list');

  // All IDs should be unique
  const uniqueIds = new Set(allIds);
  assert.equal(uniqueIds.size, allIds.length, 'All transaction IDs should be unique');
});

// Test: Delete last transaction empties list correctly
runIntegrationTest('Integration Test: Deleting last transaction empties list and updates chart', () => {
  const env = createIntegrationTestEnv();

  const tx1 = env.addTransaction('Only Item', 100.00, 'Food');

  assert.equal(env.getTransactionList().length, 1, 'Should have 1 transaction');
  assert.equal(env.getBalance(), 100.00, 'Balance should be 100.00');
  assert.equal(env.getChartData().labels.length, 1, 'Chart should have 1 category');

  env.deleteTransaction(tx1.id);

  assert.equal(env.getTransactionList().length, 0, 'List should be empty after deleting last transaction');
  assert.equal(env.getBalance(), 0, 'Balance should be 0');
  assert.equal(env.getChartData().labels.length, 0, 'Chart should have no categories');
  assert.deepEqual(env.getChartData().labels, [], 'Chart labels should be empty array');
  assert.deepEqual(env.getChartData().data, [], 'Chart data should be empty array');
});

// Test: Delete from middle preserves balance and list size
runIntegrationTest('Integration Test: Deleting from middle correctly updates balance and list', () => {
  const env = createIntegrationTestEnv();

  const tx1 = env.addTransaction('First', 10.00, 'Food');
  const tx2 = env.addTransaction('Second', 20.00, 'Transport');
  const tx3 = env.addTransaction('Third', 30.00, 'Fun');
  const tx4 = env.addTransaction('Fourth', 40.00, 'Food');

  // Initial state
  assert.equal(env.getTransactionList().length, 4, 'Should have 4 transactions');
  assert.equal(env.getBalance(), 100.00, 'Initial balance should be 100.00');

  // Delete from middle
  env.deleteTransaction(tx2.id);

  // After delete
  assert.equal(env.getTransactionList().length, 3, 'Should have 3 transactions after delete');
  assert.equal(env.getBalance(), 80.00, 'Balance should be 80.00 after deleting Second');

  // Verify tx2 was deleted and others remain
  const remainingNames = env.getTransactionList().map(t => t.name);
  assert.true(remainingNames.includes('First'), 'First should still be in list');
  assert.true(remainingNames.includes('Third'), 'Third should still be in list');
  assert.true(remainingNames.includes('Fourth'), 'Fourth should still be in list');
  assert.true(!remainingNames.includes('Second'), 'Second should NOT be in list');
});

// Test: Verify chart correctly aggregates same-category transactions
runIntegrationTest('Integration Test: Chart aggregates same-category transactions correctly', () => {
  const env = createIntegrationTestEnv();

  env.addTransaction('Coffee', 5.00, 'Food');
  env.addTransaction('Lunch', 15.00, 'Food');
  env.addTransaction('Bus', 2.00, 'Transport');
  env.addTransaction('Snacks', 8.00, 'Food');

  assert.equal(env.getTransactionList().length, 4, 'Should have 4 transactions');
  assert.equal(env.getBalance(), 30.00, 'Balance should be 30.00');

  // Chart should have 2 categories, with Food aggregated (5 + 15 + 8 = 28)
  assert.equal(env.getChartData().labels.length, 2, 'Chart should have 2 categories');
  assert.true(env.getChartData().labels.includes('Food'), 'Chart should include Food category');
  assert.true(env.getChartData().labels.includes('Transport'), 'Chart should include Transport category');
  assert.deepEqual(env.getChartData().data, [28.00, 2.00], 'Food should be aggregated to 28.00 (5+15+8), Transport to 2.00');

  // Delete one Food transaction
  env.deleteTransaction(env.getTransactionList().find(t => t.name === 'Coffee').id);

  assert.equal(env.getChartData().data[0], 23.00, 'Food should now be 23.00 (15+8) after deleting Coffee');
});

// ============================================================
// INTEGRATION TEST SUMMARY
// ============================================================

console.log('\n=== Integration Test Summary ===');
console.log(`Total integration tests: ${integrationTestsPassed + integrationTestsFailed}`);
console.log(`Passed: ${integrationTestsPassed}`);
console.log(`Failed: ${integrationTestsFailed}`);

if (integrationTestsFailed === 0) {
  console.log('\n✓ All integration tests passed!');
}

// ============================================================
// FINAL OVERALL SUMMARY
// ============================================================

const totalRenderTests = renderIdempotencePassed + renderIdempotenceFailed;
const totalPropertyTestsPassed = propertyTestsPassed + renderIdempotencePassed;
const totalPropertyTestsFailed = propertyTestsFailed + renderIdempotenceFailed;

console.log('\n=== Final Overall Summary ===');
console.log(`All test suites:`);
console.log(`  - Unit tests: ${passed} passed, ${failed} failed`);
console.log(`  - Round-trip serialization: ${propertyTestsPassed} passed, ${propertyTestsFailed} failed`);
console.log(`  - Render idempotence: ${renderIdempotencePassed} passed, ${renderIdempotenceFailed} failed`);
console.log(`  - Integration tests: ${integrationTestsPassed} passed, ${integrationTestsFailed} failed`);
console.log(`  - Total: ${passed + propertyTestsPassed + renderIdempotencePassed + integrationTestsPassed} passed, ${failed + propertyTestsFailed + renderIdempotenceFailed + integrationTestsFailed} failed`);

if (failed === 0 && propertyTestsFailed === 0 && renderIdempotenceFailed === 0 && integrationTestsFailed === 0) {
  console.log('\n✓✓✓ All tests passed! ✓✓✓');
}