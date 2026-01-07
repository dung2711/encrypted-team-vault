/**
 * Encrypted Team Vault - API Client
 * Complete workflow: Register → Login → Create Team → Add Member → Create Item → Read Item
 */

import { Crypto } from "@peculiar/webcrypto";
const crypto = new Crypto();

import {
    deriveMasterKey,
    deriveUserAsymmetricKeyPair,
    deriveUserSymmetricKey,
    genTeamKey,
    encryptTeamKey,
    decryptTeamKey,
    genItemKey,
    encryptTeamItemKey,
    decryptTeamItemKey,
    encryptData,
    decryptData
} from './crypto/index.js';

// ============================================
// Config
// ============================================
const API_BASE_URL = 'http://localhost:5001/api';

// Helper: convert Uint8Array to base64
function uint8ToBase64(uint8) {
    return Buffer.from(uint8).toString('base64');
}

// Helper: convert base64 to Uint8Array
function base64ToUint8(base64) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}

// Helper: fetch with error handling
async function apiCall(url, options = {}) {
    // Disable SSL verification for localhost testing
    //process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error (${response.status}): ${error}`);
    }

    return response.json();
}

// ============================================
// API Methods
// ============================================

/**
 * Register a new user
 */
async function registerUser(username, email, password) {
    console.log(`\nRegistering user: ${username}...`);

    // 1. Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // 2. Derive master key from password
    const masterKey = await deriveMasterKey(password, salt);
    
    // 3. Derive user keypair
    const { publicKey, privateKey } = await deriveUserAsymmetricKeyPair(masterKey);
    
    // 4. Derive symmetric key to encrypt private key
    const symmetricKey = await deriveUserSymmetricKey(masterKey);
    
    // 5. Encrypt private key with symmetric key
    // Using a simple approach - in production use proper authenticated encryption
    const { encryptedDataBytes, iv } = await encryptData({
        dataBytes: privateKey,
        itemKeyBytes: symmetricKey,
        itemId: 'user-private-key',
        keyVersion: 1
    });
    
    // Combine IV + encrypted private key for storage
    const encryptedPrivateKeyWithIV = new Uint8Array(iv.length + encryptedDataBytes.length);
    encryptedPrivateKeyWithIV.set(iv);
    encryptedPrivateKeyWithIV.set(encryptedDataBytes, iv.length);

    // 6. Call API
    const response = await apiCall(`${API_BASE_URL}/User/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
            username,
            email,
            password, 
            publicKey: uint8ToBase64(publicKey),
            encryptedPrivateKey: uint8ToBase64(encryptedPrivateKeyWithIV),
            kdfSalt: uint8ToBase64(salt)
        })
    });

    console.log(`User registered with ID: ${response.id}`);
    
    return {
        userId: response.id,
        username: response.username,
        publicKey,
        privateKey,
        salt
    };
}

/**
 * Login user
 */
async function loginUser(usernameOrEmail, password) {
    console.log(`\nLogging in: ${usernameOrEmail}...`);

    const response = await apiCall(`${API_BASE_URL}/Auth/login`, {
        method: 'POST',
        body: JSON.stringify({
            usernameOrEmail,
            password
        })
    });

    console.log(`Login successful! Token received.`);
    
    return {
        token: response.token,
        userId: response.userId,
        username: response.username,
        email: response.email
    };
}

/**
 * Get user key materials and decrypt private key
 */
async function loadUserKeys(userId, token, password) {
    console.log(`\nLoading user keys...`);

    // Get key materials from server
    const keyMaterials = await apiCall(`${API_BASE_URL}/User/${userId}/key`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    // Decode from base64
    const publicKey = base64ToUint8(keyMaterials.publicKey);
    const encryptedPrivateKeyWithIV = base64ToUint8(keyMaterials.encryptedPrivateKey);
    const salt = base64ToUint8(keyMaterials.kdfSalt);

    // Derive keys again
    const masterKey = await deriveMasterKey(password, salt);
    const symmetricKey = await deriveUserSymmetricKey(masterKey);

    // Extract IV and encrypted private key
    const iv = encryptedPrivateKeyWithIV.slice(0, 12);
    const encryptedPrivateKey = encryptedPrivateKeyWithIV.slice(12);

    // Decrypt private key
    const privateKey = await decryptData({
        encryptedDataBytes: encryptedPrivateKey,
        itemKeyBytes: symmetricKey,
        itemId: 'user-private-key',
        keyVersion: 1,
        iv
    });

    console.log(`User keys loaded successfully`);

    return { publicKey, privateKey };
}

/**
 * Create a new team
 */
async function createTeam(teamName, token, creatorPublicKey) {
    console.log(`\nCreating team: ${teamName}...`);

    // 1. Generate team key
    const teamKey = await genTeamKey();

    // 2. Encrypt team key for creator
    const encryptedTeamKey = await encryptTeamKey(teamKey, creatorPublicKey);

    // 3. Call API
    const response = await apiCall(`${API_BASE_URL}/Team`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            teamName,
            encryptedTeamKeyForCreator: uint8ToBase64(encryptedTeamKey)
        })
    });

    console.log(`Team created with ID: ${response.id}`);

    return {
        teamId: response.id,
        teamName: response.name,
        teamKey // Keep in memory for creating items
    };
}

/**
 * Get user's teams
 */
async function getTeams(token) {
    console.log(`\nGetting user's teams...`);

    const response = await apiCall(`${API_BASE_URL}/Team`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    console.log(`Found ${response.count} team(s)`);
    response.teams.forEach(team => {
        console.log(`   - ${team.name} (ID: ${team.id})`);
    });

    return response.teams;
}

/**
 * Add member to team
 */
async function addMemberToTeam(teamId, memberUserId, teamKey, memberPublicKey, token) {
    console.log(`\nAdding member ${memberUserId} to team...`);

    // Encrypt team key for the new member
    const encryptedTeamKey = await encryptTeamKey(teamKey, memberPublicKey);

    await apiCall(`${API_BASE_URL}/Team/${teamId}/members`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            userId: memberUserId,
            encryptedTeamKey: uint8ToBase64(encryptedTeamKey)
        })
    });

    console.log(`Member added successfully`);
}

/**
 * Create vault item
 */
async function createVaultItem(teamId, teamKey, itemData, token) {
    console.log(`\nCreating vault item...`);

    // 1. Generate item key
    const itemKey = await genItemKey();

    // 2. Encrypt item data
    const dataBytes = new TextEncoder().encode(JSON.stringify(itemData));
    const itemId = crypto.randomUUID();
    const keyVersion = 1;

    const { encryptedDataBytes, iv } = await encryptData({
        dataBytes,
        itemKeyBytes: itemKey,
        itemId,
        keyVersion
    });

    // Combine IV + encrypted data for storage
    const encryptedBlobWithIV = new Uint8Array(iv.length + encryptedDataBytes.length);
    encryptedBlobWithIV.set(iv);
    encryptedBlobWithIV.set(encryptedDataBytes, iv.length);

    // 3. Encrypt item key with team key
    const encryptedItemKey = await encryptTeamItemKey(itemKey, teamKey);

    // 4. Call API
    const response = await apiCall(`${API_BASE_URL}/teams/${teamId}/items`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            encryptedBlob: uint8ToBase64(encryptedBlobWithIV),
            encryptedItemKey: uint8ToBase64(encryptedItemKey),
            keyVersion
        })
    });

    console.log(`Item created with ID: ${response.id}`);

    return response;
}

/**
 * Get vault item and decrypt
 */
async function getVaultItem(teamId, itemId, teamKey, token) {
    console.log(`\nGetting vault item ${itemId}...`);

    const response = await apiCall(`${API_BASE_URL}/teams/${teamId}/items/${itemId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    // Decode from base64
    const encryptedBlobWithIV = base64ToUint8(response.encryptedBlob);
    const encryptedItemKey = base64ToUint8(response.encryptedItemKey);

    // Decrypt item key
    const itemKey = await decryptTeamItemKey(encryptedItemKey, teamKey);

    // Extract IV and encrypted data
    const iv = encryptedBlobWithIV.slice(0, 12);
    const encryptedBlob = encryptedBlobWithIV.slice(12);

    // Decrypt data
    const decryptedBytes = await decryptData({
        encryptedDataBytes: encryptedBlob,
        itemKeyBytes: itemKey,
        itemId: response.id,
        keyVersion: response.keyVersion,
        iv
    });

    const decryptedData = JSON.parse(new TextDecoder().decode(decryptedBytes));

    console.log(`✅ Item decrypted successfully:`, decryptedData);

    return decryptedData;
}

