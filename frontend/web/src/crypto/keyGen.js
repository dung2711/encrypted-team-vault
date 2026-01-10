import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();
import sodium from "libsodium-wrappers";
import { validateUint8Array, validateString } from './validation.js';

/**
    @param {string} password - The user's password. Example: "correct horse battery staple"
    @param {Uint8Array(16)} salt - A 16-byte salt. Example: crypto.getRandomValues(new Uint8Array(16))
    @returns {Uint8Array(32)} - The derived master key (32 bytes). 
*/
export async function deriveMasterKey(password, salt) {
    validateString(password, 'password');
    validateUint8Array(salt, 'salt', 16);
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const derivedKey = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations: 1000,
            hash: "SHA-256",
        },
        key,
        256
    );

    return new Uint8Array(derivedKey);
}

/**
    @param {Uint8Array(32)} masterKeyBytes - The master key (32 bytes).
    @returns {Object} - An object containing the user's asymmetric key pair:
        {
            publicKey: Uint8Array(32),
            privateKey: Uint8Array(32)
        }
*/
export async function deriveUserAsymmetricKeyPair(masterKeyBytes) {
    validateUint8Array(masterKeyBytes, 'masterKeyBytes', 32);

    const hkdfKey = await crypto.subtle.importKey(
        "raw",
        masterKeyBytes,
        { name: "HKDF" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const seedBuffer = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            info: new TextEncoder().encode("user-x25519-keypair"),
            salt: new Uint8Array([]),
        },
        hkdfKey,
        256
    );

    await sodium.ready;
    const seed = new Uint8Array(seedBuffer);
    const keyPair = sodium.crypto_box_seed_keypair(seed);

    return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
    };
}

/**
 * 
 * @param {Uint8Array(32)} masterKeyBytes 
 * @returns {Uint8Array(32)} - The derived personal key (32 bytes).
 */
export async function deriveUserSymmetricKey(masterKeyBytes) {
    validateUint8Array(masterKeyBytes, 'masterKeyBytes', 32);

    const hkdfKey = await crypto.subtle.importKey(
        "raw",
        masterKeyBytes,
        { name: "HKDF" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const symmetricKeyBuffer = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            hash: "SHA-256",
            info: new TextEncoder().encode("user-symmetric-key"),
            salt: new Uint8Array([]),
        },
        hkdfKey,
        256
    );

    return new Uint8Array(symmetricKeyBuffer);
}

/**
 * Generates a new random symmetric key for AES-GCM encryption.
 * @returns {CryptoKey} - The generated symmetric key.
 */
export async function genSymmetricKey() {
    return await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true,  // extractable must be true to export the key
        ["encrypt", "decrypt"]
    );
}

