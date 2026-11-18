import crypto from 'node:crypto';

const KEY_LENGTH = 64;

const scrypt = (password, salt) =>
    new Promise((resolve, reject) => {
        crypto.scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
    });

// Stored as "scrypt$<salt>$<hash>" (both base64).
export async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(password, salt);
    return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
    const [scheme, salt, hash] = String(stored).split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'base64');
    const actual = await scrypt(password, Buffer.from(salt, 'base64'));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
