import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is required for MFA encryption');
  return createHash('sha256').update(secret).digest();
}

export function encryptMfaSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

export function decryptMfaSecret(payload: string): string {
  const [ivValue, tagValue, encryptedValue] = payload.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Invalid MFA secret');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function base32Encode(value: Buffer): string {
  let bits = '';
  for (const byte of value) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let index = 0; index < bits.length; index += 5) {
    output += BASE32_ALPHABET[parseInt(bits.slice(index, index + 5).padEnd(5, '0'), 2)];
  }
  return output;
}

function base32Decode(value: string): Buffer {
  let bits = '';
  for (const character of value.replace(/=+$/g, '').toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error('Invalid base32 value');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function createMfaSecret(): string {
  return base32Encode(randomBytes(20));
}

function totp(secret: string, timeStep: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));
  const digest = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return value.toString().padStart(6, '0');
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const step = Math.floor(now / 30_000);
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(totp(secret, step + window));
    const supplied = Buffer.from(code);
    return expected.length === supplied.length && timingSafeEqual(expected, supplied);
  });
}

export function createRecoveryCodes(): string[] {
  return Array.from({ length: 10 }, () => randomBytes(6).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-'));
}

export function hashRecoveryCode(code: string): string {
  return createHmac('sha256', key()).update(code.replace(/-/g, '').toUpperCase()).digest('hex');
}

export async function verifyAndConsumeSecondFactor(
  userId: string,
  encryptedSecret: string,
  recoveryHashes: string[],
  input: string,
): Promise<boolean> {
  const normalized = input.trim();
  if (verifyTotp(decryptMfaSecret(encryptedSecret), normalized)) return true;
  const hash = hashRecoveryCode(normalized);
  if (!recoveryHashes.includes(hash)) return false;
  const remaining = recoveryHashes.filter((candidate) => candidate !== hash);
  const consumed = await prisma.user.updateMany({
    where: { id: userId, mfaRecoveryCodes: { has: hash } },
    data: { mfaRecoveryCodes: { set: remaining } },
  });
  return consumed.count === 1;
}

