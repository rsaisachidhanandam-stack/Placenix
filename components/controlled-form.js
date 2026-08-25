// ============================================================
// PLACENIX — CONTROLLED INPUTS & REACTIVE FORM ENGINE
// Demonstrates:
// 1. Controlled Component Pattern (Single Source of Truth: UI state strictly drives input value)
// 2. Real-Time Two-Way State Binding with validation on input & blur
// 3. Touched / Dirty State Tracking to avoid showing premature errors
// 4. Dynamic Multi-Field Form Synchronization & Computed Readiness
// ============================================================

export class ControlledFormEngine {
  constructor(initialValues = {}, validationRules = {}, onChange = null) {
    this.values = { ...initialValues };
    this.initialValues = { ...initialValues };
    this.errors = {};
    this.touched = {};
    this.validationRules = validationRules;
    this.onChangeCallback = onChange;
    this.subscribers = new Set();
  }

  /**
   * Sets the value for a controlled input field, runs validators, and notifies listeners
   */
  setFieldValue(fieldName, value) {
    this.values[fieldName] = value;
    this.validateField(fieldName);
    this.notify();
    if (this.onChangeCallback) {
      this.onChangeCallback(this.getState());
    }
  }

  /**
   * Marks a field as visited (touched) when user blurs out of it
   */
  setFieldTouched(fieldName) {
    this.touched[fieldName] = true;
    this.validateField(fieldName);
    this.notify();
  }

  /**
   * Runs validation rules on a specific field
   */
  validateField(fieldName) {
    const rules = this.validationRules[fieldName];
    if (!rules) return;

    const value = this.values[fieldName];
    let fieldError = null;

    if (rules.required && (!value || String(value).trim() === '')) {
      fieldError = rules.requiredMessage || `${fieldName} is required`;
    } else if (rules.minLength && String(value).length < rules.minLength) {
      fieldError = `Must be at least ${rules.minLength} characters`;
    } else if (rules.maxLength && String(value).length > rules.maxLength) {
      fieldError = `Cannot exceed ${rules.maxLength} characters`;
    } else if (rules.pattern && !rules.pattern.test(String(value))) {
      fieldError = rules.patternMessage || `Invalid format`;
    } else if (rules.min !== undefined && Number(value) < rules.min) {
      fieldError = `Minimum allowed value is ${rules.min}`;
    } else if (rules.max !== undefined && Number(value) > rules.max) {
      fieldError = `Maximum allowed value is ${rules.max}`;
    } else if (rules.custom) {
      fieldError = rules.custom(value, this.values);
    }

    if (fieldError) {
      this.errors[fieldName] = fieldError;
    } else {
      delete this.errors[fieldName];
    }
  }

  /**
   * Validates all fields across the entire form
   */
  validateAll() {
    Object.keys(this.validationRules).forEach(field => {
      this.touched[field] = true;
      this.validateField(field);
    });
    this.notify();
    return Object.keys(this.errors).length === 0;
  }

  /**
   * Resets form back to pristine initial state
   */
  resetForm() {
    this.values = { ...this.initialValues };
    this.errors = {};
    this.touched = {};
    this.notify();
  }

  /**
   * Retrieves full reactive state snapshot
   */
  getState() {
    const hasErrors = Object.keys(this.errors).length > 0;
    const isDirty = Object.keys(this.values).some(k => this.values[k] !== this.initialValues[k]);
    const isValid = !hasErrors;

    return {
      values: { ...this.values },
      errors: { ...this.errors },
      touched: { ...this.touched },
      isValid,
      isDirty,
      canSubmit: isValid && isDirty
    };
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify() {
    const state = this.getState();
    this.subscribers.forEach(listener => listener(state));
  }

  /**
   * Factory helper to bind a DOM input element to this controlled form
   */
  bindInput(element, fieldName) {
    if (!element) return;

    // 1. Controlled Value Binding (Single source of truth)
    element.value = this.values[fieldName] !== undefined ? this.values[fieldName] : '';

    // 2. Real-time onInput handler
    element.addEventListener('input', (e) => {
      this.setFieldValue(fieldName, e.target.value);
    });

    // 3. onBlur touch tracking
    element.addEventListener('blur', () => {
      this.setFieldTouched(fieldName);
    });
  }
}
