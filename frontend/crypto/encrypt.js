import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();
import { validateUint8Array, validateString, validateNumber } from './validation.js';

/**
    * Encrypts data using the item key.
    * @param {Uint8Array} dataBytes - The plaintext data bytes to encrypt.
    * @param {Uint8Array(32)} itemKeyBytes - The item key to use for encryption (32 bytes).
    * @param {string} itemId - The ID of the item.
    * @param {number} keyVersion - The version of the key.
    * @returns {Object} - An object containing:
    *    {
    *        encryptedDataBytes: Uint8Array,
    *        iv: Uint8Array(12),
    *        aadBytes: Uint8Array
    *    }
*/
export async function encryptData({ dataBytes, itemKeyBytes, itemId, keyVersion }) {
    // Input validation
    validateUint8Array(dataBytes, 'dataBytes');
    validateUint8Array(itemKeyBytes, 'itemKeyBytes', 32);
    validateString(itemId, 'itemId');
    validateNumber(keyVersion, 'keyVersion');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(`domain:data|itemId:${itemId}|keyVersion:${keyVersion}`);

    const itemKey = await crypto.subtle.importKey(
        "raw",
        itemKeyBytes,
        { name: "AES-GCM" },
        false,
        ["encrypt"]
    );

    const encryptedDataBuffer = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
            additionalData: aad,
        },
        itemKey,
        dataBytes
    );

    return {
        encryptedDataBytes: new Uint8Array(encryptedDataBuffer),
        iv,
        aadBytes: aad,
    };
}