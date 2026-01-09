// frontend/flows/itemFlow.js

import {
  createTeamItem,
  getTeamItems,
  getTeamItemById,
  updateTeamItem,
  deleteTeamItem,
  createPersonalItem,
  getPersonalItems,
  getPersonalItemById,
  updatePersonalItem,
  deletePersonalItem,
} from "../services/itemApi.js";
import {
  createNewTeamSecret,
  decryptTeamSecret,
  updateTeamSecret,
} from "../protocol/teamProtocol.js";
import {
  createNewPersonalSecret,
  decryptPersonalSecret,
  updatePersonalSecret,
} from "../protocol/userProtocol.js";

const base64ToUint8 = (base64) =>
  new Uint8Array(Buffer.from(base64, "base64"));
const uint8ToBase64 = (uint8) =>
  Buffer.from(uint8).toString("base64");

/**
 * Tạo team item:
 * - dùng protocol.createNewTeamSecret để:
 *   + gen itemKey
 *   + encrypt itemKey bằng teamKey
 *   + encrypt data bằng itemKey
 * - pack IV + ciphertext thành blob base64 để gửi backend
 */
export async function handleCreateTeamItem({
  teamId,
  secret,
  teamKeyBytes,
  keyVersion,
}) {
  const strSecret =
    typeof secret === "string" ? secret : JSON.stringify(secret);

  const {
    itemId,
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
  } = await createNewTeamSecret({
    secret: strSecret,
    teamId,
    teamKeyBytes,
    keyVersion,
  });

  const encryptedBlobWithIV = new Uint8Array(
    dataIv.length + encryptedDataBytes.length
  );
  encryptedBlobWithIV.set(dataIv);
  encryptedBlobWithIV.set(encryptedDataBytes, dataIv.length);

  const encryptedItemKeyWithIV = new Uint8Array(
    itemKeyIv.length + encryptedItemKeyBytes.length
  );
  encryptedItemKeyWithIV.set(itemKeyIv);
  encryptedItemKeyWithIV.set(encryptedItemKeyBytes, itemKeyIv.length);

  const apiItem = await createTeamItem({
    teamId,
    encryptedBlob: uint8ToBase64(encryptedBlobWithIV),
    encryptedItemKey: uint8ToBase64(encryptedItemKeyWithIV),
    keyVersion,
  });

  return { itemId, apiItem };
}

/**
 * Giải mã team item:
 * - GET /teams/{teamId}/items/{itemId}
 * - tách IV + ciphertext cho blob và itemKey
 * - dùng decryptTeamSecret để decrypt ra plaintext
 */
export async function handleDecryptTeamItem({
  teamId,
  itemId,
  teamKeyBytes,
}) {
  const item = await getTeamItemById(teamId, itemId);
  if (!item || !item.encryptedBlob || !item.encryptedItemKey) {
    throw new Error("Invalid team item from backend");
  }

  const encryptedBlobWithIV = base64ToUint8(item.encryptedBlob);
  const dataIv = encryptedBlobWithIV.slice(0, 12);
  const encryptedDataBytes = encryptedBlobWithIV.slice(12);

  const encryptedItemKeyWithIV = base64ToUint8(item.encryptedItemKey);
  const itemKeyIv = encryptedItemKeyWithIV.slice(0, 12);
  const encryptedItemKeyBytes = encryptedItemKeyWithIV.slice(12);

  const plaintext = await decryptTeamSecret({
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
    teamId,
    teamKeyBytes,
    itemId: item.id,
    keyVersion: item.keyVersion,
  });

  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

/**
 * Tạo personal item:
 * - dùng createNewPersonalSecret (protocol/userProtocol)
 * - pack IV + ciphertext tương tự team item
 */
export async function handleCreatePersonalItem({
  secret,
  userId,
  keyVersion = 1,
}) {
  const strSecret =
    typeof secret === "string" ? secret : JSON.stringify(secret);

  const {
    itemId,
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
  } = await createNewPersonalSecret({
    secret: strSecret,
    userId,
    keyVersion,
  });

  const encryptedBlobWithIV = new Uint8Array(
    dataIv.length + encryptedDataBytes.length
  );
  encryptedBlobWithIV.set(dataIv);
  encryptedBlobWithIV.set(encryptedDataBytes, dataIv.length);

  const encryptedItemKeyWithIV = new Uint8Array(
    itemKeyIv.length + encryptedItemKeyBytes.length
  );
  encryptedItemKeyWithIV.set(itemKeyIv);
  encryptedItemKeyWithIV.set(encryptedItemKeyBytes, itemKeyIv.length);

  const apiItem = await createPersonalItem({
    encryptedBlob: uint8ToBase64(encryptedBlobWithIV),
    encryptedItemKey: uint8ToBase64(encryptedItemKeyWithIV),
    keyVersion,
  });

  return { itemId, apiItem };
}

/**
 * Giải mã personal item:
 * - GET /user/items/{itemId}
 * - tách IV + ciphertext cho blob & itemKey
 * - dùng decryptPersonalSecret
 */
export async function handleDecryptPersonalItem({ itemId, userId }) {
  const item = await getPersonalItemById(itemId);
  if (!item || !item.encryptedBlob || !item.encryptedItemKey) {
    throw new Error("Invalid personal item from backend");
  }

  const encryptedBlobWithIV = base64ToUint8(item.encryptedBlob);
  const dataIv = encryptedBlobWithIV.slice(0, 12);
  const encryptedDataBytes = encryptedBlobWithIV.slice(12);

  const encryptedItemKeyWithIV = base64ToUint8(item.encryptedItemKey);
  const itemKeyIv = encryptedItemKeyWithIV.slice(0, 12);
  const encryptedItemKeyBytes = encryptedItemKeyWithIV.slice(12);

  const plaintext = await decryptPersonalSecret({
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
    userId,
    itemId: item.id,
    keyVersion: item.keyVersion,
  });

  try {
    return JSON.parse(plaintext);
  } catch {
    return plaintext;
  }
}

// ========== LIST & DECRYPT ALL ==========

/**
 * Lấy và giải mã tất cả personal items
 */
export async function handleGetAllPersonalItems({ userId }) {
  const res = await getPersonalItems();
  const items = res?.items || [];

  const decryptedItems = [];
  for (const item of items) {
    try {
      const encryptedBlobWithIV = base64ToUint8(item.encryptedBlob);
      const dataIv = encryptedBlobWithIV.slice(0, 12);
      const encryptedDataBytes = encryptedBlobWithIV.slice(12);

      const encryptedItemKeyWithIV = base64ToUint8(item.encryptedItemKey);
      const itemKeyIv = encryptedItemKeyWithIV.slice(0, 12);
      const encryptedItemKeyBytes = encryptedItemKeyWithIV.slice(12);

      const plaintext = await decryptPersonalSecret({
        encryptedItemKeyBytes,
        itemKeyIv,
        encryptedDataBytes,
        dataIv,
        userId,
        itemId: item.id,
        keyVersion: item.keyVersion,
      });

      let data;
      try {
        data = JSON.parse(plaintext);
      } catch {
        data = plaintext;
      }

      decryptedItems.push({
        ...item,
        decryptedData: data,
      });
    } catch (err) {
      // If decryption fails, include item with error
      decryptedItems.push({
        ...item,
        decryptedData: null,
        decryptError: err.message,
      });
    }
  }

  return decryptedItems;
}

/**
 * Lấy và giải mã tất cả team items
 */
export async function handleGetAllTeamItems({ teamId, teamKeyBytes }) {
  const res = await getTeamItems(teamId);
  const items = res?.items || [];

  const decryptedItems = [];
  for (const item of items) {
    try {
      const encryptedBlobWithIV = base64ToUint8(item.encryptedBlob);
      const dataIv = encryptedBlobWithIV.slice(0, 12);
      const encryptedDataBytes = encryptedBlobWithIV.slice(12);

      const encryptedItemKeyWithIV = base64ToUint8(item.encryptedItemKey);
      const itemKeyIv = encryptedItemKeyWithIV.slice(0, 12);
      const encryptedItemKeyBytes = encryptedItemKeyWithIV.slice(12);

      const plaintext = await decryptTeamSecret({
        encryptedItemKeyBytes,
        itemKeyIv,
        encryptedDataBytes,
        dataIv,
        teamId,
        teamKeyBytes,
        itemId: item.id,
        keyVersion: item.keyVersion,
      });

      let data;
      try {
        data = JSON.parse(plaintext);
      } catch {
        data = plaintext;
      }

      decryptedItems.push({
        ...item,
        decryptedData: data,
      });
    } catch (err) {
      decryptedItems.push({
        ...item,
        decryptedData: null,
        decryptError: err.message,
      });
    }
  }

  return decryptedItems;
}

// ========== UPDATE ==========

/**
 * Cập nhật personal item:
 * - Decrypt item cũ để lấy itemKey (hoặc gen key mới)
 * - Re-encrypt với data mới
 */
export async function handleUpdatePersonalItem({
  itemId,
  newSecret,
  userId,
  keyVersion = 1,
}) {
  const strSecret =
    typeof newSecret === "string" ? newSecret : JSON.stringify(newSecret);

  const {
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
  } = await updatePersonalSecret({
    secret: strSecret,
    userId,
    itemId,
    keyVersion,
  });

  const encryptedBlobWithIV = new Uint8Array(
    dataIv.length + encryptedDataBytes.length
  );
  encryptedBlobWithIV.set(dataIv);
  encryptedBlobWithIV.set(encryptedDataBytes, dataIv.length);

  const encryptedItemKeyWithIV = new Uint8Array(
    itemKeyIv.length + encryptedItemKeyBytes.length
  );
  encryptedItemKeyWithIV.set(itemKeyIv);
  encryptedItemKeyWithIV.set(encryptedItemKeyBytes, itemKeyIv.length);

  const apiItem = await updatePersonalItem({
    itemId,
    encryptedBlob: uint8ToBase64(encryptedBlobWithIV),
    encryptedItemKey: uint8ToBase64(encryptedItemKeyWithIV),
    keyVersion,
  });

  return apiItem;
}

/**
 * Cập nhật team item
 */
export async function handleUpdateTeamItem({
  teamId,
  itemId,
  newSecret,
  teamKeyBytes,
  keyVersion,
}) {
  const strSecret =
    typeof newSecret === "string" ? newSecret : JSON.stringify(newSecret);

  const {
    encryptedItemKeyBytes,
    itemKeyIv,
    encryptedDataBytes,
    dataIv,
  } = await updateTeamSecret({
    secret: strSecret,
    teamId,
    teamKeyBytes,
    itemId,
    keyVersion,
  });

  const encryptedBlobWithIV = new Uint8Array(
    dataIv.length + encryptedDataBytes.length
  );
  encryptedBlobWithIV.set(dataIv);
  encryptedBlobWithIV.set(encryptedDataBytes, dataIv.length);

  const encryptedItemKeyWithIV = new Uint8Array(
    itemKeyIv.length + encryptedItemKeyBytes.length
  );
  encryptedItemKeyWithIV.set(itemKeyIv);
  encryptedItemKeyWithIV.set(encryptedItemKeyBytes, itemKeyIv.length);

  const apiItem = await updateTeamItem({
    teamId,
    itemId,
    encryptedBlob: uint8ToBase64(encryptedBlobWithIV),
    encryptedItemKey: uint8ToBase64(encryptedItemKeyWithIV),
    keyVersion,
  });

  return apiItem;
}

// ========== DELETE ==========

/**
 * Xoá personal item
 */
export async function handleDeletePersonalItem(itemId) {
  return await deletePersonalItem(itemId);
}

/**
 * Xoá team item
 */
export async function handleDeleteTeamItem(teamId, itemId) {
  return await deleteTeamItem(teamId, itemId);
}