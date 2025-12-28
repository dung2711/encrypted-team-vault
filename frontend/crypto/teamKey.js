import { genSymmetricKey } from "./keyGen.js";
import sodium from "libsodium-wrappers";
import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();
import { validateUint8Array } from './validation.js';

/**
    * Generates a new random team key for encrypting item keys.
    * @returns {Uint8Array(32)} - The generated team key (32 bytes).
*/
export async function genTeamKey() {
    const symmetricKey = await genSymmetricKey();
    const raw = await crypto.subtle.exportKey("raw", symmetricKey);
    return new Uint8Array(raw);
}

/**
    * Encrypts a team key for a team member using their public key.
    * @param {Uint8Array(32)} teamKeyBytes - The team key to encrypt (32 bytes).
    * @param {Uint8Array(32)} memberPublicKeyBytes - The member's public key (32 bytes).
    * @returns {Uint8Array} - The encrypted team key bytes.
*/
export async function encryptTeamKey({ teamKeyBytes, memberPublicKeyBytes }) {
    validateUint8Array(teamKeyBytes, 'teamKeyBytes', 32);
    validateUint8Array(memberPublicKeyBytes, 'memberPublicKeyBytes', 32);

    await sodium.ready;
    const encryptedTeamKeyBytes = sodium.crypto_box_seal(
        teamKeyBytes,
        memberPublicKeyBytes
    );
    return new Uint8Array(encryptedTeamKeyBytes);
}

/**
    * Decrypts a team key for a team member using their key pair.
    * @param {Uint8Array} encryptedTeamKeyBytes - The encrypted team key bytes.
    * @param {Uint8Array(32)} memberPublicKeyBytes - The member's public key (32 bytes).
    * @param {Uint8Array(32)} memberPrivateKeyBytes - The member's private key (32 bytes).
    * @returns {Uint8Array(32)} - The decrypted team key (32 bytes).
*/
export async function decryptTeamKey({ encryptedTeamKeyBytes, memberPublicKeyBytes, memberPrivateKeyBytes }) {
    validateUint8Array(encryptedTeamKeyBytes, 'encryptedTeamKeyBytes');
    validateUint8Array(memberPublicKeyBytes, 'memberPublicKeyBytes', 32);
    validateUint8Array(memberPrivateKeyBytes, 'memberPrivateKeyBytes', 32);

    await sodium.ready;
    const decryptedTeamKeyBytes = sodium.crypto_box_seal_open(
        encryptedTeamKeyBytes,
        memberPublicKeyBytes,
        memberPrivateKeyBytes
    );
    return new Uint8Array(decryptedTeamKeyBytes);
}