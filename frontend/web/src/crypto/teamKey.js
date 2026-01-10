import { genSymmetricKey } from "./keyGen.js";
import sodium from "libsodium-wrappers";
import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();
import { validateUint8Array, validateNumber, validateString } from './validation.js';

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
    * @param {string} teamId - The ID of the team.
    * @param {string} memberId - The ID of the member.
    * @param {number} keyVersion - The version of the key.
    * @returns {Uint8Array} - The encrypted team key bytes.
*/
export async function encryptTeamKey({ teamKeyBytes, memberPublicKeyBytes, teamId, memberId, keyVersion }) {
    validateUint8Array(teamKeyBytes, 'teamKeyBytes', 32);
    validateUint8Array(memberPublicKeyBytes, 'memberPublicKeyBytes', 32);
    validateString(teamId, 'teamId');
    validateString(memberId, 'memberId');
    validateNumber(keyVersion, 'keyVersion');
    const message = JSON.stringify({
        domain: "team-key",
        teamId,
        memberId,
        keyVersion,
        teamKey: sodium.to_base64(teamKeyBytes),
    });

    await sodium.ready;
    const encryptedTeamKeyBytes = sodium.crypto_box_seal(
        new TextEncoder().encode(message),
        memberPublicKeyBytes
    );
    return new Uint8Array(encryptedTeamKeyBytes);
}

/**
    * Decrypts a team key for a team member using their key pair.
    * @param {Uint8Array} encryptedMessage - The encrypted message bytes.
    * @param {Uint8Array(32)} memberPublicKeyBytes - The member's public key (32 bytes).
    * @param {Uint8Array(32)} memberPrivateKeyBytes - The member's private key (32 bytes).
    * @param {string} teamId - The ID of the team.
    * @param {string} memberId - The ID of the member.
    * @param {number} keyVersion - The version of the key.
    * @returns {Uint8Array(32)} - The decrypted team key (32 bytes).
*/
export async function decryptTeamKey({ encryptedMessage, memberPublicKeyBytes, memberPrivateKeyBytes, teamId, memberId, keyVersion }) {
    validateUint8Array(encryptedMessage, 'encryptedMessage');
    validateUint8Array(memberPublicKeyBytes, 'memberPublicKeyBytes', 32);
    validateUint8Array(memberPrivateKeyBytes, 'memberPrivateKeyBytes', 32);
    validateString(teamId, 'teamId');
    validateString(memberId, 'memberId');
    validateNumber(keyVersion, 'keyVersion');

    await sodium.ready;
    const decryptedTeamKeyBytes = sodium.crypto_box_seal_open(
        encryptedMessage,
        memberPublicKeyBytes,
        memberPrivateKeyBytes
    );

    const decodedMessage = new TextDecoder().decode(decryptedTeamKeyBytes);
    const messageObj = JSON.parse(decodedMessage);

    if (messageObj.domain !== "team-key" ||
        messageObj.teamId !== teamId ||
        messageObj.memberId !== memberId ||
        messageObj.keyVersion !== keyVersion) {
        throw new Error("Decrypted team key metadata does not match expected values.");
    }
    return new Uint8Array(sodium.from_base64(messageObj.teamKey));
}