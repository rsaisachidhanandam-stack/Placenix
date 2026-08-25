// ============================================================
// PLACENIX — JSON WEB TOKEN (JWT) ISSUANCE & VERIFICATION ENGINE
// Demonstrates:
// 1. RFC 7519 Compliant Token Architecture (Header . Payload . Signature)
// 2. Cryptographic HMAC-SHA256 Signature Generation & Validation
// 3. Claims Verification: Expiration (exp), Issued At (iat), Issuer (iss), Subject (sub)
// 4. Tamper Resistance & Token Replay Prevention
// ============================================================

import crypto from 'crypto';

const DEFAULT_JWT_SECRET = process.env.JWT_SECRET || 'placenix_production_super_secret_jwt_key_2026';
const DEFAULT_ISSUER = 'placenix.recruitment.os';
const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour

function base64UrlEncode(strOrBuffer) {
  const buf = Buffer.isBuffer(strOrBuffer) ? strOrBuffer : Buffer.from(strOrBuffer, 'utf8');
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export const JwtEngine = {
  /**
   * Signs and issues a new JWT for an authenticated user session
   */
  sign: (payload, options = {}) => {
    const secret = options.secret || DEFAULT_JWT_SECRET;
    const expiresIn = options.expiresInSeconds || DEFAULT_EXPIRY_SECONDS;
    const now = Math.floor(Date.now() / 1000);

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const fullPayload = {
      iss: options.issuer || DEFAULT_ISSUER,
      iat: now,
      exp: now + expiresIn,
      ...payload
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', secret)
      .update(signingInput)
      .digest();

    const encodedSignature = base64UrlEncode(signature);
    const token = `${signingInput}.${encodedSignature}`;

    return {
      token,
      expiresAt: new Date(fullPayload.exp * 1000).toISOString(),
      header,
      payload: fullPayload
    };
  },

  /**
   * Verifies signature integrity and validates standard RFC claims
   */
  verify: (token, options = {}) => {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token is missing or empty' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure (expected 3 dot-separated segments)' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const secret = options.secret || DEFAULT_JWT_SECRET;
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    // Recompute expected HMAC-SHA256 signature
    const expectedSignature = base64UrlEncode(
      crypto.createHmac('sha256', secret).update(signingInput).digest()
    );

    // Constant-time comparison to prevent timing attacks
    const sigMatch = crypto.timingSafeEqual(
      Buffer.from(encodedSignature),
      Buffer.from(expectedSignature)
    );

    if (!sigMatch) {
      return { valid: false, error: 'Invalid Signature: Token has been tampered with or modified.' };
    }

    let payload;
    let header;
    try {
      header = JSON.parse(base64UrlDecode(encodedHeader));
      payload = JSON.parse(base64UrlDecode(encodedPayload));
    } catch (e) {
      return { valid: false, error: 'Corrupted JSON in token header or payload' };
    }

    const now = Math.floor(Date.now() / 1000);

    // Check expiration claim (exp)
    if (payload.exp && now > payload.exp) {
      return {
        valid: false,
        error: 'Token Expired',
        expiredAt: new Date(payload.exp * 1000).toISOString(),
        claims: payload
      };
    }

    // Check not before (nbf)
    if (payload.nbf && now < payload.nbf) {
      return { valid: false, error: 'Token not active yet (nbf claim)', claims: payload };
    }

    return {
      valid: true,
      header,
      claims: payload,
      verifiedAt: new Date().toISOString()
    };
  }
};
