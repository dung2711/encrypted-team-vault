import {
    genItemKey,
    encryptPersonalItemKey,
    decryptPersonalItemKey,
    encryptData,
    decryptData,
    deriveMasterKey,
    deriveUserAsymmetricKeyPair,
    deriveUserSymmetricKey
} from "../crypto/index.js";
import { keyStore } from "./keyStore.js";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto-browserify';

const randomBytes = crypto.randomBytes;

/**
 * Prepare registration payload with encrypted keys
 * Generates salt, derives keys, encrypts private key for storage
 */
export async function prepareRegistrationPayload({ username, email, password }) {
    // Generate random salt (16 bytes)
    const saltBytes = new Uint8Array(randomBytes(16));

    // Derive master key from password + salt
    const masterKeyBytes = await deriveMasterKey(password, saltBytes);

    // Derive public key (private key will be derived fresh on each login)
    const { publicKey } = await deriveUserAsymmetricKeyPair(masterKeyBytes);

    // Convert to base64 for transmission
    const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');

    return {
        username,
        email,
        password, // Backend needs this for its own hashing
        publicKey: toBase64(publicKey),
        kdfSalt: toBase64(saltBytes)
    };
}

export async function createNewPersonalSecret({ secret, userId, keyVersion }) {
    // Generate a new item key for the personal secret
    const itemKeyBytes = await genItemKey();
    const itemId = uuidv4();

    // Encrypt the item key with the user's personal key
    const { encryptedItemKeyBytes, iv: itemKeyIv, aadBytes: itemKeyAad } = await encryptPersonalItemKey({
        itemKeyBytes,
        userKeyBytes: keyStore.userSymmetricKey,
        userId,
        itemId,
        keyVersion
    });

    // Encrypt the secret data with the item key
    const dataBytes = new TextEncoder().encode(secret);
    const { encryptedDataBytes, iv: dataIv, aadBytes: dataAad } = await encryptData({
        dataBytes,
        itemKeyBytes,
        itemId,
        keyVersion
    });

    return {
        itemId,
        encryptedItemKeyBytes,
        itemKeyIv,
        encryptedDataBytes,
        dataIv,
    }
}

export async function decryptPersonalSecret({ encryptedItemKeyBytes, itemKeyIv, encryptedDataBytes, dataIv, userId, itemId, keyVersion }) {
    // Decrypt the item key with the user's personal key
    const itemKeyBytes = await decryptPersonalItemKey({
        encryptedItemKeyBytes,
        userKeyBytes: keyStore.userSymmetricKey,
        userId,
        itemId,
        keyVersion,
        iv: itemKeyIv
    });

    // Decrypt the secret data with the item key
    const decryptedDataBytes = await decryptData({
        encryptedDataBytes,
        itemKeyBytes,
        itemId,
        keyVersion,
        iv: dataIv
    });

    return new TextDecoder().decode(decryptedDataBytes);
}

/**
 * Update existing personal secret (re-encrypt with new data)
 * Can reuse the same item key or generate a new one
 */
export async function updatePersonalSecret({
    secret,
    userId,
    itemId,
    keyVersion,
    reuseItemKey = false,
    existingEncryptedItemKey = null,
    existingItemKeyIv = null
}) {
    let itemKeyBytes;
    let encryptedItemKeyBytes;
    let itemKeyIv;

    if (reuseItemKey && existingEncryptedItemKey && existingItemKeyIv) {
        // Decrypt existing item key to reuse it
        itemKeyBytes = await decryptPersonalItemKey({
            encryptedItemKeyBytes: existingEncryptedItemKey,
            userKeyBytes: keyStore.userSymmetricKey,
            userId,
            itemId,
            keyVersion,
            iv: existingItemKeyIv
        });

        encryptedItemKeyBytes = existingEncryptedItemKey;
        itemKeyIv = existingItemKeyIv;
    } else {
        // Generate new item key
        itemKeyBytes = await genItemKey();

        const encryptedItemKeyResult = await encryptPersonalItemKey({
            itemKeyBytes,
            userKeyBytes: keyStore.userSymmetricKey,
            userId,
            itemId,
            keyVersion
        });

        encryptedItemKeyBytes = encryptedItemKeyResult.encryptedItemKeyBytes;
        itemKeyIv = encryptedItemKeyResult.iv;
    }

    // Encrypt the new secret data
    const dataBytes = new TextEncoder().encode(secret);
    const { encryptedDataBytes, iv: dataIv } = await encryptData({
        dataBytes,
        itemKeyBytes,
        itemId,
        keyVersion
    });

    return {
        encryptedItemKeyBytes,
        itemKeyIv,
        encryptedDataBytes,
        dataIv,
    };
}

