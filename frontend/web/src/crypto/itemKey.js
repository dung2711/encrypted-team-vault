import { genSymmetricKey } from "./keyGen.js";
import { Crypto } from "@peculiar/webcrypto";
import { validateUint8Array, validateString, validateNumber } from './validation.js';

const crypto = new Crypto();

/**
    * Generates a new random item key for encrypting item data.
    * @returns {Uint8Array(32)} - The generated item key (32 bytes).
*/
export async function genItemKey() {
    const symmetricKey = await genSymmetricKey();
    const raw = await crypto.subtle.exportKey("raw", symmetricKey);
    return new Uint8Array(raw);
}

// Internal function to handle item key encryption
async function encryptItemKey({ itemKeyBytes, symmetricKeyBytes, iv, aadBytes }) {
    const symmetricKey = await crypto.subtle.importKey(
        "raw",
        symmetricKeyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    const encryptedItemKeyBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
            additionalData: aadBytes,
        },
        symmetricKey,
        itemKeyBytes
    );

    return new Uint8Array(encryptedItemKeyBuffer);
}

// Internal function to handle item key decryption
async function decryptItemKey({ encryptedItemKeyBytes, symmetricKeyBytes, iv, aadBytes }) {
    const symmetricKey = await crypto.subtle.importKey(
        "raw",
        symmetricKeyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decryptedItemKeyBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
            additionalData: aadBytes,
        },
        symmetricKey,
        encryptedItemKeyBytes
    );

    return new Uint8Array(decryptedItemKeyBuffer);
}

/**
    * Encrypts an item key using the team key.
    * @param {Uint8Array(32)} itemKeyBytes - The item key to encrypt (32 bytes).
    * @param {Uint8Array(32)} teamKeyBytes - The team key to use for encryption (32 bytes).
    * @param {string} teamId - The ID of the team.
    * @param {string} itemId - The ID of the item.
    * @param {number} keyVersion - The version of the key.
    * @returns {Object} - An object containing:
    *   {
    *       encryptedItemKeyBytes: Uint8Array,
    *       iv: Uint8Array(12),
    *       aadBytes: Uint8Array
    *   }
*/
export async function encryptTeamItemKey({ itemKeyBytes, teamKeyBytes, teamId, itemId, keyVersion }) {
    validateUint8Array(itemKeyBytes, 'itemKeyBytes', 32);
    validateUint8Array(teamKeyBytes, 'teamKeyBytes', 32);
    validateString(teamId, 'teamId');
    validateString(itemId, 'itemId');
    validateNumber(keyVersion, 'keyVersion');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(`domain:team|teamId:${teamId}|itemId:${itemId}|keyVersion:${keyVersion}`);
    const encryptedItemKeyBytes = await encryptItemKey({ itemKeyBytes, symmetricKeyBytes: teamKeyBytes, iv, aadBytes: aad });
    return {
        encryptedItemKeyBytes,
        iv,
        aadBytes: aad,
    };
}

/**
    * Decrypts an item key using the personal user key.
    * @param {Uint8Array} encryptedItemKeyBytes - The encrypted item key bytes.
    * @param {Uint8Array(32)} userKeyBytes - The user's personal key (32 bytes).
    * @param {string} userId - The ID of the user.
    * @param {string} itemId - The ID of the item.
    * @param {number} keyVersion - The version of the key.
    * @param {Uint8Array(12)} iv - The initialization vector used during encryption (12 bytes).
    * @returns {Uint8Array(32)} - The decrypted item key (32 bytes).
*/
export async function encryptPersonalItemKey({ itemKeyBytes, userKeyBytes, userId, itemId, keyVersion }) {
    validateUint8Array(itemKeyBytes, 'itemKeyBytes', 32);
    validateUint8Array(userKeyBytes, 'userKeyBytes', 32);
    validateString(userId, 'userId');
    validateString(itemId, 'itemId');
    validateNumber(keyVersion, 'keyVersion');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(`domain:user|userId:${userId}|itemId:${itemId}|keyVersion:${keyVersion}`);
    const encryptedItemKeyBytes = await encryptItemKey({ itemKeyBytes, symmetricKeyBytes: userKeyBytes, iv, aadBytes: aad });
    return {
        encryptedItemKeyBytes,
        iv,
        aadBytes: aad,
    };
}

/**
    * Decrypts an item key using the team key.
    * @param {Uint8Array} encryptedItemKeyBytes - The encrypted item key bytes.
    * @param {Uint8Array(32)} teamKeyBytes - The team key to use for decryption (32 bytes).
    * @param {string} teamId - The ID of the team.
    * @param {string} itemId - The ID of the item.
    * @param {number} keyVersion - The version of the key.
    * @param {Uint8Array(12)} iv - The initialization vector used during encryption (12 bytes).
    * @returns {Uint8Array(32)} - The decrypted item key (32 bytes).
*/
export async function decryptTeamItemKey({ encryptedItemKeyBytes, teamKeyBytes, teamId, itemId, keyVersion, iv }) {
    validateUint8Array(encryptedItemKeyBytes, 'encryptedItemKeyBytes');
    validateUint8Array(teamKeyBytes, 'teamKeyBytes', 32);
    validateString(teamId, 'teamId');
    validateString(itemId, 'itemId');
    validateNumber(keyVersion, 'keyVersion');
    validateUint8Array(iv, 'iv', 12);

    const aad = new TextEncoder().encode(`domain:team|teamId:${teamId}|itemId:${itemId}|keyVersion:${keyVersion}`);
    return await decryptItemKey({ encryptedItemKeyBytes, symmetricKeyBytes: teamKeyBytes, iv, aadBytes: aad });
}

/**
    * Decrypts an item key using the personal user key.
    * @param {Uint8Array} encryptedItemKeyBytes - The encrypted item key bytes.
    * @param {Uint8Array(32)} userKeyBytes - The user's personal key (32 bytes).
    * @param {string} userId - The ID of the user.
    * @param {string} itemId - The ID of the item.
    * @param {number} keyVersion - The version of the key.
    * @param {Uint8Array(12)} iv - The initialization vector used during encryption (12 bytes).
    * @returns {Uint8Array(32)} - The decrypted item key (32 bytes).
*/
export async function decryptPersonalItemKey({ encryptedItemKeyBytes, userKeyBytes, userId, itemId, keyVersion, iv }) {
    validateUint8Array(encryptedItemKeyBytes, 'encryptedItemKeyBytes');
    validateUint8Array(userKeyBytes, 'userKeyBytes', 32);
    validateString(userId, 'userId');
    validateString(itemId, 'itemId');
    validateNumber(keyVersion, 'keyVersion');
    validateUint8Array(iv, 'iv', 12);

    const aad = new TextEncoder().encode(`domain:user|userId:${userId}|itemId:${itemId}|keyVersion:${keyVersion}`);
    return await decryptItemKey({ encryptedItemKeyBytes, symmetricKeyBytes: userKeyBytes, iv, aadBytes: aad });
}

