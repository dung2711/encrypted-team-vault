import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();
import { validateUint8Array, validateString, validateNumber } from './validation.js';

/**
 * Decrypts data using the item key.
 * @param {Uint8Array} encryptedDataBytes - The encrypted data bytes to decrypt.
 * @param {Uint8Array(32)} itemKeyBytes - The item key to use for decryption (32 bytes).
 * @param {string} itemId - The ID of the item.
 * @param {number} keyVersion - The version of the key.
 * @param {Uint8Array(12)} iv - The initialization vector used during encryption (12 bytes).
 * @returns {Uint8Array} - The decrypted data bytes.
*/
export async function decryptData({ encryptedDataBytes, itemKeyBytes, itemId, keyVersion, iv }) {
    // Input validation
    validateUint8Array(encryptedDataBytes, 'encryptedDataBytes');
    validateUint8Array(itemKeyBytes, 'itemKeyBytes', 32);
    validateString(itemId, 'itemId');
    validateNumber(keyVersion, 'keyVersion');
    validateUint8Array(iv, 'iv', 12);
    const aad = new TextEncoder().encode(`domain:data|itemId:${itemId}|keyVersion:${keyVersion}`);

    const itemKey = await crypto.subtle.importKey(
        "raw",
        itemKeyBytes,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    const decryptedDataBuffer = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv,
            additionalData: aad,
        },
        itemKey,
        encryptedDataBytes
    );

    return new Uint8Array(decryptedDataBuffer);
}