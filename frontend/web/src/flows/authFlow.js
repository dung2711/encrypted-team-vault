// frontend/flows/authFlow.js

import { Buffer } from 'buffer';
import { login, register, logout as logoutApi, change_password } from "../services/authApi.js";
import { getTeams, getEncryptedTeamKey } from "../services/teamApi.js";
import { getPersonalItems } from "../services/itemApi.js"
import { prepareRegistrationPayload, prepareChangePassWordPayload } from "../protocol/userProtocol.js";
import { decryptTeamKeyForUser, prepareTeamKeyForNewMember } from "../protocol/teamProtocol.js";
import { decryptPersonalItemKey, encryptPersonalItemKey } from "../crypto/index.js";
import { deriveUserKeysWhenLogin, clearUserKeys, deriveUserKeysToChangePassword } from "../protocol/authProtocol.js";
import { keyStore } from "../protocol/keyStore.js";
import { tokenStore } from "../api/tokenStore.js";

const base64ToUint8 = (base64) =>
  new Uint8Array(Buffer.from(base64, "base64"));
const uint8ToBase64 = (uint8) =>
  Buffer.from(uint8).toString("base64");

/**
 * Đăng ký user mới 
 * - Dùng crypto protocol để chuẩn bị payload (publicKey, kdfSalt,...)
 * - Gọi API /auth/register
 */
export async function handleRegistration({
  username,
  email,
  password,
  autoLogin = false,
}) {
  const payload = await prepareRegistrationPayload({ username, email, password });
  const res = await register(payload);

  if (!autoLogin) return res;

  await handleLogin({ username, password });
  return res;
}

/**
 * Đăng nhập:
 * - Gọi /auth/login để lấy token, userId, kdfSalt
 * - Lưu token vào tokenStore
 * - Dùng authProtocol để derive user keys (lưu vào keyStore)
 */
export async function handleLogin({ username, password }) {
  const res = await login(username, password);

  if (!res) {
    throw new Error("Login failed: empty response");
  }

  const accessToken = res.accessToken || res.token;
  const userId = res.userId || res.id;

  if (!accessToken || !userId) {
    throw new Error("Login response missing token or userId");
  }

  if (!res.kdfSalt) {
    throw new Error("Login response missing kdfSalt (backend must be updated)");
  }

  tokenStore.set(accessToken);

  const saltBytes = base64ToUint8(res.kdfSalt);

  await deriveUserKeysWhenLogin({
    password,
    salt: saltBytes,
  });

  return {
    ...res,
    accessToken,
    userId,
  };
}

/**
 * Logout:
 * - Gọi API /auth/logout (option, tuỳ backend)
 * - Clear token & key trong client
 */
export async function handleLogout({ refreshToken } = {}) {
  try {
    if (refreshToken) {
      await logoutApi(refreshToken);
    }
  } catch {
    // ignore API error trên client, vẫn clear local state
  }

  tokenStore.clear();
  await clearUserKeys();
}

export async function handleChangePassword({ userId, oldPassword, newPassword }) {
  // Get current keys from keyStore (populated during login)
  const currentAsymmetricKeyPair = keyStore.userAsymmetricKeyPair;
  const currentSymmetricKey = keyStore.userSymmetricKey;

  if (!currentAsymmetricKeyPair?.privateKey || !currentSymmetricKey) {
    throw new Error("Current user keys not found in keyStore. Please log in again.");
  }

  // Derive new keys from new password
  const { publicKey, kdfSalt } = await prepareChangePassWordPayload({ newPassword });
  // Note: kdfSalt and publicKey are already base64 strings from prepareChangePassWordPayload
  const { asymmetricKeyPair: newAsymmetricKeyPair, symmetricKey: newSymmetricKey } = await deriveUserKeysToChangePassword({
    password: newPassword,
    salt: base64ToUint8(kdfSalt),  // Convert base64 string to Uint8Array for key derivation
  });

  // Get current teamKeys and re-encrypt them with new keys
  const allTeamOfUser = await getTeams();
  const teamsArray = Array.isArray(allTeamOfUser) ? allTeamOfUser : (allTeamOfUser?.teams || []);

  const currentDecryptedTeamKeys = await Promise.all(
    teamsArray.map(async (team) => {
      const res = await getEncryptedTeamKey(team.id);
      const encryptedTeamKeyBytes = base64ToUint8(res.encryptedTeamKey);

      // Decrypt teamKey with current user keys
      const teamKey = await decryptTeamKeyForUser({
        encryptedTeamKeyBytes,
        teamId: team.id,
        userId,
        keyVersion: res.keyVersion
      });

      return {
        teamId: team.id,
        teamKey,
        currentKeyVersion: res.keyVersion,
      };
    })
  );

  const newEncryptedTeamKeys = await Promise.all(
    currentDecryptedTeamKeys.map(async ({ teamId, teamKey, currentKeyVersion }) => {
      // Re-encrypt teamKey with new user's public key
      // IMPORTANT: Keep the same keyVersion! The team key itself hasn't changed,
      // only the wrapper (user's asymmetric key) changed.
      const encryptedTeamKeyBytes = await prepareTeamKeyForNewMember({
        teamKeyBytes: teamKey,
        memberPublicKeyBytes: newAsymmetricKeyPair.publicKey,
        teamId: teamId,
        memberId: userId,
        keyVersion: currentKeyVersion  // Keep same version, don't increment!
      });

      return {
        teamId: teamId,
        encryptedTeamKey: uint8ToBase64(encryptedTeamKeyBytes),
        keyVersion: currentKeyVersion,  // Keep same version
      };
    })
  );

  // Get current personalItemKeys and re-encrypt them with new keys
  const personalItems = await getPersonalItems();
  const itemsArray = Array.isArray(personalItems) ? personalItems : (personalItems?.items || []);

  const currentDecryptedPersonalItemKeys = await Promise.all(
    itemsArray.map(async (item) => {
      // Decrypt itemKey with current user keys
      const encryptedItemKeyWithIV = base64ToUint8(item.encryptedItemKey);
      const itemKeyIv = encryptedItemKeyWithIV.slice(0, 12);
      const encryptedItemKeyBytes = encryptedItemKeyWithIV.slice(12);

      const itemKeyBytes = await decryptPersonalItemKey({
        encryptedItemKeyBytes,
        userKeyBytes: currentSymmetricKey,
        userId,
        itemId: item.id,
        keyVersion: item.keyVersion,
        iv: itemKeyIv
      });

      return {
        itemId: item.id,
        itemKey: itemKeyBytes,
        currentKeyVersion: item.keyVersion,
      };
    })
  );

  const newEncryptedPersonalItemKeys = await Promise.all(
    currentDecryptedPersonalItemKeys.map(async ({ itemId, itemKey, currentKeyVersion }) => {
      // Re-encrypt itemKey with new user keys
      // IMPORTANT: Keep the same keyVersion! The encrypted data blob uses keyVersion in its AAD,
      // and we're NOT re-encrypting the data, only the item key wrapper.
      const { encryptedItemKeyBytes, iv: itemKeyIv } = await encryptPersonalItemKey({
        itemKeyBytes: itemKey,
        userKeyBytes: newSymmetricKey,
        userId,
        itemId,
        keyVersion: currentKeyVersion  // Keep same version, don't increment!
      });

      const encryptedItemKeyWithIV = new Uint8Array(
        itemKeyIv.length + encryptedItemKeyBytes.length
      );
      encryptedItemKeyWithIV.set(itemKeyIv);
      encryptedItemKeyWithIV.set(encryptedItemKeyBytes, itemKeyIv.length);

      return {
        itemId,
        encryptedItemKey: uint8ToBase64(encryptedItemKeyWithIV),
        keyVersion: currentKeyVersion,  // Keep same version
      };
    })
  );

  // Call change password API
  // Note: kdfSalt and publicKey are already base64 strings, don't encode again!
  await change_password({
    oldPassword,
    newPassword,
    kdfSalt: kdfSalt,  // Already base64 string
    publicKey: publicKey,  // Already base64 string
    reEncryptedTeamKeys: newEncryptedTeamKeys,
    reEncryptedPersonalItemKeys: newEncryptedPersonalItemKeys,
  });
}