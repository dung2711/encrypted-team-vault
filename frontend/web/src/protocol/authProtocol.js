import { keyStore } from "./keyStore.js";
import { deriveUserAsymmetricKeyPair, deriveUserSymmetricKey, deriveMasterKey } from "../crypto/index.js";

export async function deriveUserKeysWhenLogin({ password, salt }) {
    // Derive master key
    const masterKey = await deriveMasterKey(password, salt);

    // Derive user asymmetric key pair
    const { publicKey, privateKey } = await deriveUserAsymmetricKeyPair(masterKey);
    keyStore.userAsymmetricKeyPair = { publicKey, privateKey };

    // Derive user symmetric key
    const symmetricKey = await deriveUserSymmetricKey(masterKey);
    keyStore.userSymmetricKey = symmetricKey;
}

export async function clearUserKeys() {
    keyStore.userAsymmetricKeyPair = {};
    keyStore.userSymmetricKey = null;
}