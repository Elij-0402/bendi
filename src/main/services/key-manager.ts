import { safeStorage } from 'electron'

/**
 * Encrypt an API key for storage.
 * Returns a base64-encoded string so it can be stored as TEXT in sql.js
 * (sql.js does not natively support Buffer columns).
 */
export function encryptKey(key: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted: Buffer = safeStorage.encryptString(key)
    return encrypted.toString('base64')
  }
  // Fallback to base64 encoding in development mode
  return Buffer.from(key, 'utf-8').toString('base64')
}

/**
 * Decrypt an API key retrieved from the database.
 * Accepts a base64-encoded string (as stored by encryptKey / sql.js TEXT column).
 */
export function decryptKey(encrypted: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    const buf = Buffer.from(encrypted, 'base64')
    return safeStorage.decryptString(buf)
  }
  // Fallback from base64 encoding in development mode
  return Buffer.from(encrypted, 'base64').toString('utf-8')
}
