import { Buffer } from 'buffer';
import { v4 as uuidv4 } from 'uuid';
import {
  createTeam,
  getTeams,
  getTeamById,
  addMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
  getEncryptedTeamKey,
  updateTeamKeyFor1Member,
  getTeamMembers
} from "../services/teamApi.js";
import { getUserPublicKey, getUserInfo } from "../services/userApi.js";
import {
  createNewTeam,
  decryptTeamKeyForUser,
  prepareTeamKeyForNewMember,
  rotateTeamKey,
} from "../protocol/teamProtocol.js";

const base64ToUint8 = (base64) =>
  new Uint8Array(Buffer.from(base64, "base64"));
const uint8ToBase64 = (uint8) =>
  Buffer.from(uint8).toString("base64");

/**
 * Get current user from localStorage (set by AuthContext)
 */
const getCurrentUser = () => {
  const storedUser = localStorage.getItem('currentUser');
  if (!storedUser) {
    throw new Error('No authenticated user found');
  }
  try {
    return JSON.parse(storedUser);
  } catch (e) {
    throw new Error('Invalid user data in storage');
  }
};

/**
 * Lấy danh sách team của user hiện tại (dựa trên JWT)
 */
export async function handleGetTeams() {
  const res = await getTeams();
  return res;
}

/**
 * Tạo team mới:
 * - gen teamKey + encryptTeamKey cho creator (protocol)
 * - gửi encryptedTeamKeyForCreator lên backend
 * - trả về team từ backend + teamKey trong RAM để dùng ngay
 */
export async function handleCreateTeam(teamName) {
  const teamId = uuidv4();
  const currentUser = await getCurrentUser();
  const userId = currentUser.id;

  const {
    teamKey,
    encryptedTeamKeyForCreator,
  } = await createNewTeam({
    teamName,
    teamId,
    userId,
    keyVersion: 1
  });

  const apiTeam = await createTeam({
    id: teamId,
    teamName: teamName,
    encryptedTeamKeyForCreator: uint8ToBase64(encryptedTeamKeyForCreator),
  });

  return {
    apiTeam,
    teamKeyBytes: teamKey,
  };
}

/**
 * Lấy thông tin chi tiết team (metadata, không có key)
 */
export async function handleGetTeamById(teamId) {
  const res = await getTeamById(teamId);
  return res;
}

/**
 * Load team key cho user hiện tại:
 * - gọi /teams/{teamId}/key (service hiện tại)
 * - decryptTeamKeyForUser (protocol) để ra teamKeyBytes
 */
export async function handleLoadTeamKey(teamId) {
  const res = await getEncryptedTeamKey(teamId);
  if (!res || !res.encryptedTeamKey) {
    throw new Error("Cannot load encrypted team key from backend");
  }

  const encryptedTeamKeyBytes = base64ToUint8(res.encryptedTeamKey);
  const currentUser = await getCurrentUser();
  const userId = currentUser.id;
  const keyVersion = res.keyVersion ?? 1;

  const teamKeyBytes = await decryptTeamKeyForUser({
    encryptedTeamKeyBytes,
    teamId,
    userId,
    keyVersion
  });

  return {
    teamKeyBytes,
    keyVersion,
  };
}

/**
 * Thêm member vào team:
 * - decrypt teamKey của admin hiện tại
 * - get publicKey của member mới
 * - encryptTeamKey cho member
 * - gọi addMemberToTeam với userId + encryptedTeamKey
 */
export async function handleAddMemberToTeam(teamId, newMemberUserId) {
  // Validate userId is a valid UUID
  if (!newMemberUserId || newMemberUserId.length !== 36) {
    throw new Error("Invalid user ID format");
  }

  // 1. Lấy encryptedTeamKey cho current user
  const res = await getEncryptedTeamKey(teamId);
  const encryptedTeamKeyBytes = base64ToUint8(res.encryptedTeamKey);
  const currentUser = await getCurrentUser();
  const userId = currentUser.id;
  const keyVersion = res.keyVersion ?? 1;

  const teamKeyBytes = await decryptTeamKeyForUser({
    encryptedTeamKeyBytes,
    teamId,
    userId,
    keyVersion
  });

  // 2. Lấy public key của member
  const pkRes = await getUserPublicKey(newMemberUserId);
  if (!pkRes || !pkRes.publicKey) {
    throw new Error("Cannot load public key for user " + newMemberUserId);
  }
  const memberPublicKeyBytes = base64ToUint8(pkRes.publicKey);

  // 3. Mã hoá team key cho member
  const encryptedForMember = await prepareTeamKeyForNewMember({
    teamKeyBytes,
    memberPublicKeyBytes,
    teamId,
    memberId: newMemberUserId,
    keyVersion
  });

  // 4. Gọi API thêm member (giữ nguyên shape body như hiện tại)
  const body = {
    userId: newMemberUserId,
    encryptedTeamKey: uint8ToBase64(encryptedForMember),
  };

  const apiRes = await addMemberToTeam(teamId, body.userId, body.encryptedTeamKey);
  return apiRes;
}

/**
 * Xoá member khỏi team
 * - Chỉ admin/owner mới có quyền
 * - QUAN TRỌNG: Rotate team key sau khi xoá member để member cũ không decrypt được nữai
 */
export async function handleRemoveMemberFromTeam(teamId, memberId) {
  // 1. Lấy danh sách members hiện tại từ backend
  const membersRes = await getTeamMembers(teamId);
  const currentMembers = membersRes?.members || [];

  const remainingMembers = currentMembers.filter((m) => m.userId !== memberId);

  if (remainingMembers.length === 0) {
    throw new Error("Cannot remove last member. Delete the team instead.");
  }

  // 2. Lấy encrypted team key hiện tại và decrypt
  const keyRes = await getEncryptedTeamKey(teamId);
  if (!keyRes || !keyRes.encryptedTeamKey) {
    throw new Error("Cannot load encrypted team key from backend");
  }

  const encryptedTeamKeyBytes = base64ToUint8(keyRes.encryptedTeamKey);
  const currentKeyVersion = keyRes.keyVersion ?? 1;
  const currentUser = await getCurrentUser();
  const userId = currentUser.id;

  const teamKeyBytes = await decryptTeamKeyForUser({
    encryptedTeamKeyBytes,
    teamId,
    userId,
    keyVersion: currentKeyVersion
  });

  // 3. Lấy public key cho tất cả remaining members
  const membersWithKeys = await Promise.all(
    remainingMembers.map(async (member) => {
      const pkRes = await getUserPublicKey(member.userId);
      if (!pkRes || !pkRes.publicKey) {
        throw new Error("Cannot load public key for user " + member.userId);
      }
      return {
        userId: member.userId,
        publicKey: base64ToUint8(pkRes.publicKey),
      };
    })
  );

  // 4. Rotate team key cho các member còn lại
  const { newTeamKey, encryptedKeysForMembers, keyVersion: newKeyVersion } =
    await rotateTeamKey({
      members: membersWithKeys,
      keyVersion: currentKeyVersion,
      teamId
    });

  // 5. Update encrypted team key mới cho từng member
  await Promise.all(
    encryptedKeysForMembers.map(({ userId, encryptedTeamKey }) =>
      updateTeamKeyFor1Member(
        teamId,
        userId,
        newKeyVersion,
        uint8ToBase64(encryptedTeamKey)
      )
    )
  );

  // 6. Cuối cùng xoá member khỏi team
  const apiRes = await removeMemberFromTeam(teamId, memberId);

  return {
    ...apiRes,
    newKeyVersion,
    newTeamKeyBytes: newTeamKey,
  };
}

/**
 * Xoá team
 * - Chỉ owner mới có quyền
 * - Gọi DELETE /teams/{teamId}
 */
export async function handleDeleteTeam(teamId) {
  const apiRes = await deleteTeam(teamId);
  return apiRes;
}

/**
 * Lấy danh sách members của team
 */
export async function handleGetTeamMembers(teamId) {
  const res = await getTeamMembers(teamId);
  return res?.members || [];
}