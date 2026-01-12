import { keyStore } from "./keyStore.js";
import { deriveUserAsymmetricKeyPair, deriveUserSymmetricKey, deriveMasterKey } from "../crypto/index.js";

export async function deriveUserKeysWhenLogin({ password, salt }) {
    console.log('=== Deriving User Keys ===');
    console.log('Salt length:', salt?.length);

    // Derive master key
    const masterKey = await deriveMasterKey(password, salt);
    console.log('Master key derived, length:', masterKey?.length);

    // Derive user asymmetric key pair
    const { publicKey, privateKey } = await deriveUserAsymmetricKeyPair(masterKey);
    keyStore.userAsymmetricKeyPair = { publicKey, privateKey };
    console.log('Asymmetric keys derived - public:', publicKey?.length, 'private:', privateKey?.length);

    // Derive user symmetric key
    const symmetricKey = await deriveUserSymmetricKey(masterKey);
    keyStore.userSymmetricKey = symmetricKey;
    console.log('Symmetric key derived and stored, length:', symmetricKey?.length);
    console.log('Symmetric key first 10 bytes:', Array.from(symmetricKey.slice(0, 10)));
}

export async function deriveUserKeysToChangePassword({ password, salt }) {
    console.log('=== Deriving User Keys for Password Change ===');
    console.log('Salt length:', salt?.length);

    // Derive master key
    const masterKey = await deriveMasterKey(password, salt);
    console.log('Master key derived, length:', masterKey?.length);

    // Derive user asymmetric key pair
    const { publicKey, privateKey } = await deriveUserAsymmetricKeyPair(masterKey);
    console.log('Asymmetric keys derived - public:', publicKey?.length, 'private:', privateKey?.length);

    // Derive user symmetric key
    const symmetricKey = await deriveUserSymmetricKey(masterKey);
    console.log('Symmetric key derived, length:', symmetricKey?.length);
    console.log('Symmetric key first 10 bytes:', Array.from(symmetricKey.slice(0, 10)));

    return {
        asymmetricKeyPair: { publicKey, privateKey },
        symmetricKey
    };
}

export async function clearUserKeys() {
    keyStore.userAsymmetricKeyPair = {};
    keyStore.userSymmetricKey = null;
}