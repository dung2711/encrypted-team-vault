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
    console.log('=== Creating Personal Secret ===');
    console.log('userId:', userId, 'type:', typeof userId);
    console.log('keyVersion:', keyVersion, 'type:', typeof keyVersion);
    console.log('User symmetric key available:', !!keyStore.userSymmetricKey);
    console.log('User symmetric key length:', keyStore.userSymmetricKey?.length);

    // Generate a new item key for the personal secret
    const itemKeyBytes = await genItemKey();
    const itemId = uuidv4();
    console.log('Generated itemId:', itemId);

    // Encrypt the item key with the user's personal key
    console.log('Encrypting item key with AAD: domain:user|userId:' + userId + '|itemId:' + itemId + '|keyVersion:' + keyVersion);
    const { encryptedItemKeyBytes, iv: itemKeyIv, aadBytes: itemKeyAad } = await encryptPersonalItemKey({
        itemKeyBytes,
        userKeyBytes: keyStore.userSymmetricKey,
        userId,
        itemId,
        keyVersion
    });
    console.log('Item key encrypted, length:', encryptedItemKeyBytes.length);

    // Encrypt the secret data with the item key
    const dataBytes = new TextEncoder().encode(secret);
    console.log('Encrypting data with AAD: domain:data|itemId:' + itemId + '|keyVersion:' + keyVersion);
    const { encryptedDataBytes, iv: dataIv, aadBytes: dataAad } = await encryptData({
        dataBytes,
        itemKeyBytes,
        itemId,
        keyVersion
    });
    console.log('Data encrypted, length:', encryptedDataBytes.length);

    return {
        itemId,
        encryptedItemKeyBytes,
        itemKeyIv,
        encryptedDataBytes,
        dataIv,
    }
}

export async function decryptPersonalSecret({ encryptedItemKeyBytes, itemKeyIv, encryptedDataBytes, dataIv, userId, itemId, keyVersion }) {
    console.log('=== Decrypting Personal Secret ===');
    console.log('itemId:', itemId, 'type:', typeof itemId);
    console.log('userId:', userId, 'type:', typeof userId);
    console.log('keyVersion:', keyVersion, 'type:', typeof keyVersion);
    console.log('User symmetric key available:', !!keyStore.userSymmetricKey);
    console.log('encryptedItemKeyBytes length:', encryptedItemKeyBytes?.length);
    console.log('itemKeyIv length:', itemKeyIv?.length);
    console.log('encryptedDataBytes length:', encryptedDataBytes?.length);
    console.log('dataIv length:', dataIv?.length);

    if (!keyStore.userSymmetricKey) {
        throw new Error('User symmetric key not available. Please log in again.');
    }

    try {
        console.log('Step 1: Decrypting item key...');
        console.log('Constructing AAD: domain:user|userId:' + userId + '|itemId:' + itemId + '|keyVersion:' + keyVersion);

        // Decrypt the item key with the user's personal key
        const itemKeyBytes = await decryptPersonalItemKey({
            encryptedItemKeyBytes,
            userKeyBytes: keyStore.userSymmetricKey,
            userId,
            itemId,
            keyVersion,
            iv: itemKeyIv
        });
        console.log('Step 1: Item key decrypted successfully, length:', itemKeyBytes.length);

        console.log('Step 2: Decrypting data...');
        console.log('Constructing AAD: domain:data|itemId:' + itemId + '|keyVersion:' + keyVersion);

        // Decrypt the secret data with the item key
        const decryptedDataBytes = await decryptData({
            encryptedDataBytes,
            itemKeyBytes,
            itemId,
            keyVersion,
            iv: dataIv
        });
        console.log('Step 2: Data decrypted successfully');

        const result = new TextDecoder().decode(decryptedDataBytes);
        console.log('Decryption complete');
        return result;
    } catch (error) {
        console.error('Decryption failed:', error.message);
        console.error('Error stack:', error.stack);
        throw error;
    }
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
