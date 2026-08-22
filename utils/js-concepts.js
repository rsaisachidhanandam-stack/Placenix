// ============================================================
// PLACENIX — JAVASCRIPT CORE ARCHITECTURAL CONCEPTS & PATTERNS
// Demonstrates:
// 1. Closures (Encapsulation, Memoization, Rate Limiting, Currying)
// 2. Event Loop (Microtasks vs Macrotasks, RAF Scheduling)
// 3. Hoisting & TDZ (Function Declarations vs Variable Declarations)
// 4. Promises vs Callbacks (Promisification, Async/Await Utilities)
// ============================================================

// ── 1. CLOSURES ARCHITECTURE ──────────────────────────────────

/**
 * Closure Pattern 1: Private State Encapsulation (Module Pattern)
 * The inner functions retain lexical scope references to private variables
 * without exposing them to the global window or outer environment.
 */
export function createSecureTokenVault(initialSecret = '') {
  let _secret = initialSecret;
  let _accessCount = 0;

  return {
    getSecretMasked: () => {
      _accessCount++;
      return _secret.length > 4 ? _secret.substring(0, 3) + '****' + _secret.slice(-2) : '****';
    },
    setSecret: (newSecret) => {
      if (typeof newSecret === 'string' && newSecret.length >= 8) {
        _secret = newSecret;
        _accessCount = 0;
        return true;
      }
      return false;
    },
    getTelemetry: () => ({ accessCount: _accessCount })
  };
}

/**
 * Closure Pattern 2: Higher-Order Memoization Cache
 * Caches computationally expensive results (e.g. Employability Radar / ATS Math)
 */
export function memoizeWithClosure(fn) {
  const cache = new Map(); // Preserved via closure

  return function (...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return { result: cache.get(key), fromCache: true };
    }
    const computed = fn.apply(this, args);
    cache.set(key, computed);
    return { result: computed, fromCache: false };
  };
}

/**
 * Closure Pattern 3: Token-Bucket Rate Limiter with Debounce
 */
export function createDebounceWithClosure(fn, delayMs = 300) {
  let timerId = null; // Enclosed private timer reference

  return function (...args) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
      timerId = null;
    }, delayMs);
  };
}


// ── 2. EVENT LOOP (MICROTASKS VS MACROTASKS) ──────────────────

/**
 * Event Loop Demonstration:
 * Explains and measures task scheduling order:
 * 1. Synchronous Code (Call Stack)
 * 2. Microtask Queue (Promise callbacks, queueMicrotask, MutationObserver)
 * 3. Render Steps (requestAnimationFrame)
 * 4. Macrotask Queue (setTimeout, setInterval, I/O events, setImmediate)
 */
export function executeEventLoopTelemetry(onLog = console.log) {
  const executionOrder = [];

  const logStep = (label) => {
    const timestamp = performance.now().toFixed(2);
    executionOrder.push({ label, timestamp });
    onLog(`[EventLoop @ ${timestamp}ms] ${label}`);
  };

  // 1. Synchronous Step
  logStep('1. [Synchronous] Start Execution');

  // 2. Macrotask (Timer)
  setTimeout(() => {
    logStep('4. [Macrotask] setTimeout (0ms queue)');
  }, 0);

  // 3. Microtask (Promise)
  Promise.resolve().then(() => {
    logStep('2. [Microtask] Promise.resolve().then()');
  });

  // 4. Microtask (queueMicrotask)
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      logStep('3. [Microtask] queueMicrotask()');
    });
  }

  // 5. Render Step (requestAnimationFrame if in browser)
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      logStep('5. [Render Queue] requestAnimationFrame()');
    });
  }

  logStep('1b. [Synchronous] End Execution');

  return executionOrder;
}


// ── 3. HOISTING & TEMPORAL DEAD ZONE (TDZ) ─────────────────────

/**
 * Hoisting Architecture Analysis:
 * - Function Declarations (`function foo(){}`) are hoisted completely with their definition.
 * - `var` variables are hoisted with an initial value of `undefined`.
 * - `let` and `const` declarations are hoisted into the block scope but reside in the
 *   Temporal Dead Zone (TDZ) until evaluation, throwing ReferenceError if accessed early.
 */
export function demonstrateSafeHoisting() {
  // Function declaration is hoisted and can be called before declaration line:
  const initialGreeting = getHoistedGreeting();

  function getHoistedGreeting() {
    return 'Greetings from a hoisted Function Declaration!';
  }

  // Safe pattern: always initialize variables before access:
  const safeConstant = 'Immutable Constant Value (No TDZ hazard)';

  return {
    initialGreeting,
    safeConstant
  };
}


// ── 4. PROMISES VS CALLBACKS & PROMISIFICATION ────────────────

/**
 * Promisification Utility:
 * Converts legacy Node.js/browser error-first callback functions into standard Promises.
 * 
 * Signature of targetFn: (arg1, arg2, ..., callback(err, result))
 */
export function promisify(targetFn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      targetFn(...args, (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  };
}

/**
 * Example Comparison:
 * Legacy Callback Pattern vs Modern Async/Await with Promises
 */
export async function executeAsyncDataFlow(dataPayload) {
  // Promisified simulated async operation
  const simulatedAsyncOp = (payload, callback) => {
    setTimeout(() => {
      if (!payload) callback(new Error('Payload cannot be null'));
      else callback(null, { ...payload, processedAt: Date.now() });
    }, 50);
  };

  const promisifiedOp = promisify(simulatedAsyncOp);

  try {
    // Modern clean async/await consumption
    const result = await promisifiedOp(dataPayload);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Metadata & Description Export for UI Labs
 */
export function getConceptsSummary() {
  return [
    {
      id: 'closures',
      name: 'Closures & Lexical Scope',
      badge: 'Encapsulation',
      description: 'Functions retain access to their outer lexical environment even after parent execution completes.',
      keyPattern: 'Private state vaults, memoization caches, currying'
    },
    {
      id: 'event-loop',
      name: 'Event Loop & Task Queues',
      badge: 'Asynchronous Scheduling',
      description: 'Coordinates Call Stack, Microtask Queue (Promises), Render Queue (rAF), and Macrotask Queue (Timers/IO).',
      keyPattern: 'Synchronous -> Microtasks -> Render -> Macrotasks'
    },
    {
      id: 'hoisting',
      name: 'Hoisting & Temporal Dead Zone (TDZ)',
      badge: 'Scope Lifecycle',
      description: 'Function declarations are fully hoisted; let/const are hoisted into TDZ to prevent unsafe early access.',
      keyPattern: 'Declarations vs expressions, let/const TDZ safety'
    },
    {
      id: 'promises-callbacks',
      name: 'Promises vs Callbacks & Async/Await',
      badge: 'Control Flow',
      description: 'Eliminates callback hell using standard Promises, Promisification wrappers, and sequential async/await syntax.',
      keyPattern: 'promisify(errFirstCb), try/catch async blocks'
    }
  ];
}

