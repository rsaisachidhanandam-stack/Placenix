// ============================================================
// PLACENIX — CRYPTOGRAPHIC PASSWORD HASHING ENGINE
// Demonstrates:
// 1. Cryptographically Secure Salt Generation (crypto.randomBytes)
// 2. Slow Key Derivation via PBKDF2 / SHA-512 (Resistant to GPU brute force)
// 3. Timing-Safe String Comparison (crypto.timingSafeEqual - Anti Side-Channel)
// 4. Password Strength & Entropy Evaluation
// ============================================================

import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000; // 100k rounds recommended for modern key derivation
const KEY_LENGTH_BYTES = 64;       // 512-bit key
const DIGEST_ALGORITHM = 'sha512';
const SALT_BYTES = 16;             // 128-bit cryptographically random salt

export const PasswordHasher = {
  /**
   * Hashes a plaintext password using a freshly generated random salt and PBKDF2-SHA512.
   * Format returned: iterations$salt$hash (Standard modular format)
   */
  hashPassword: async (plainPassword) => {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string.');
    }

    const salt = crypto.randomBytes(SALT_BYTES).toString('hex');

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        plainPassword,
        salt,
        PBKDF2_ITERATIONS,
        KEY_LENGTH_BYTES,
        DIGEST_ALGORITHM,
        (err, derivedKey) => {
          if (err) return reject(err);
          const hashHex = derivedKey.toString('hex');
          const serialized = `${PBKDF2_ITERATIONS}$${salt}$${hashHex}`;
          resolve({
            serializedHash: serialized,
            salt,
            iterations: PBKDF2_ITERATIONS,
            algorithm: DIGEST_ALGORITHM,
            keyLength: KEY_LENGTH_BYTES * 8 // 512 bits
          });
        }
      );
    });
  },

  /**
   * Verifies an entered password against an existing serialized hash.
   * Employs crypto.timingSafeEqual to eliminate timing attack vectors.
   */
  verifyPassword: async (plainPassword, serializedHash) => {
    if (!plainPassword || !serializedHash) return false;

    const parts = serializedHash.split('$');
    if (parts.length !== 3) {
      throw new Error('Invalid serialized hash format. Expected iterations$salt$hashHex');
    }

    const iterations = parseInt(parts[0], 10);
    const salt = parts[1];
    const originalHashHex = parts[2];
    const originalHashBuf = Buffer.from(originalHashHex, 'hex');

    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        plainPassword,
        salt,
        iterations,
        originalHashBuf.length,
        DIGEST_ALGORITHM,
        (err, derivedKey) => {
          if (err) return reject(err);
          // Timing-safe buffer comparison
          const match = crypto.timingSafeEqual(originalHashBuf, derivedKey);
          resolve(match);
        }
      );
    });
  },

  /**
   * Calculates password entropy and security classification
   */
  evaluateStrength: (password) => {
    let score = 0;
    const checks = {
      lengthGte8: password.length >= 8,
      lengthGte12: password.length >= 12,
      hasLower: /[a-z]/.test(password),
      hasUpper: /[A-Z]/.test(password),
      hasDigit: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password)
    };

    if (checks.lengthGte8) score += 20;
    if (checks.lengthGte12) score += 20;
    if (checks.hasLower) score += 15;
    if (checks.hasUpper) score += 15;
    if (checks.hasDigit) score += 15;
    if (checks.hasSpecial) score += 15;

    let strength = 'Weak';
    if (score >= 80) strength = 'Very Strong';
    else if (score >= 60) strength = 'Strong';
    else if (score >= 40) strength = 'Moderate';

    return { score, strength, checks };
  }
};
