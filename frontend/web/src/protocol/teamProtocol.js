import {
    genTeamKey,
    encryptTeamKey,
    decryptTeamKey,
    genItemKey,
    encryptTeamItemKey,
    decryptTeamItemKey,
    encryptData,
    decryptData
} from "../crypto/index.js";
import { keyStore } from "./keyStore.js";
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new team with encrypted team key for the creator
 * Returns team key (in memory) and encrypted version for storage
 */
export async function createNewTeam({ teamName, teamId, userId, keyVersion = 1 }) {
    // Generate new team key
    const teamKeyBytes = await genTeamKey();

    // Encrypt team key for creator using their public key
    const encryptedTeamKeyForCreator = await encryptTeamKey({
        teamKeyBytes,
        memberPublicKeyBytes: keyStore.userAsymmetricKeyPair.publicKey,
        teamId,
        memberId: userId,
        keyVersion
    });

    return {
        teamName,
        teamKey: teamKeyBytes, // Keep in memory for immediate use
        encryptedTeamKeyForCreator
    };
}

/**
 * Decrypt team key for current user
 * Call this when user accesses a team
 */
export async function decryptTeamKeyForUser({ encryptedTeamKeyBytes, teamId, userId, keyVersion }) {
    const teamKeyBytes = await decryptTeamKey({
        encryptedMessage: encryptedTeamKeyBytes,
        memberPublicKeyBytes: keyStore.userAsymmetricKeyPair.publicKey,
        memberPrivateKeyBytes: keyStore.userAsymmetricKeyPair.privateKey,
        teamId,
        memberId: userId,
        keyVersion
    });

    return teamKeyBytes;
}

/**
 * Prepare encrypted team key for a new member
 * Admin calls this when inviting someone to the team
 */
export async function prepareTeamKeyForNewMember({ teamKeyBytes, memberPublicKeyBytes, teamId, memberId, keyVersion }) {
    const encryptedTeamKey = await encryptTeamKey({
        teamKeyBytes,
        memberPublicKeyBytes,
        teamId,
        memberId,
        keyVersion
    });

    return encryptedTeamKey;
}

/**
 * Create a new team secret (vault item)
 */
export async function createNewTeamSecret({ secret, teamId, teamKeyBytes, keyVersion }) {
    // Generate item key
    const itemKeyBytes = await genItemKey();
    const itemId = uuidv4();

    // Encrypt item key with team key
    const { encryptedItemKeyBytes, iv: itemKeyIv } = await encryptTeamItemKey({
        itemKeyBytes,
        teamKeyBytes,
        teamId,
        itemId,
        keyVersion
    });

    // Encrypt secret data with item key
    const dataBytes = new TextEncoder().encode(secret);
    const { encryptedDataBytes, iv: dataIv } = await encryptData({
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
        dataIv
    };
}

/**
 * Decrypt a team secret
 */
export async function decryptTeamSecret({
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
    teamId,
    teamKeyBytes,
    itemId,
    keyVersion
}) {
    // Decrypt item key with team key
    const itemKeyBytes = await decryptTeamItemKey({
        encryptedItemKeyBytes,
        teamKeyBytes,
        teamId,
        itemId,
        keyVersion,
        iv: itemKeyIv
    });

    // Decrypt secret data with item key
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
 * Update existing team secret
 */
export async function updateTeamSecret({
    secret,
    teamId,
    teamKeyBytes,
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
        // Decrypt existing item key to reuse
        itemKeyBytes = await decryptTeamItemKey({
            encryptedItemKeyBytes: existingEncryptedItemKey,
            teamKeyBytes,
            teamId,
            itemId,
            keyVersion,
            iv: existingItemKeyIv
        });

        encryptedItemKeyBytes = existingEncryptedItemKey;
        itemKeyIv = existingItemKeyIv;
    } else {
        // Generate new item key
        itemKeyBytes = await genItemKey();

        const encryptedItemKeyResult = await encryptTeamItemKey({
            itemKeyBytes,
            teamKeyBytes,
            teamId,
            itemId,
            keyVersion
        });

        encryptedItemKeyBytes = encryptedItemKeyResult.encryptedItemKeyBytes;
        itemKeyIv = encryptedItemKeyResult.iv;
    }

    // Encrypt new secret data
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
        dataIv
    };
}

/**
 * Rotate team key - generates new team key and encrypts for all members
 * Admin only operation
 */
export async function rotateTeamKey({ members, keyVersion, teamId }) {
    // Generate new team key
    const newTeamKeyBytes = await genTeamKey();
    const newKeyVersion = keyVersion + 1;

    // Encrypt for all members
    const encryptedKeysForMembers = await Promise.all(
        members.map(async (member) => ({
            userId: member.userId,
            encryptedTeamKey: await encryptTeamKey({
                teamKeyBytes: newTeamKeyBytes,
                memberPublicKeyBytes: member.publicKey,
                teamId,
                memberId: member.userId,
                keyVersion: newKeyVersion
            }),
            keyVersion: newKeyVersion
        }))
    );

    return {
        newTeamKey: newTeamKeyBytes,
        encryptedKeysForMembers,
        keyVersion: newKeyVersion
    };
}
