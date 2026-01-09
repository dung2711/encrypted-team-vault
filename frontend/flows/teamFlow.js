import {
  createTeam,
  getTeams,
  getTeamById,
  addMemberToTeam,
  removeMemberFromTeam,
  deleteTeam,
  getEncryptedTeamKey,
  updateTeamKeyFor1Member,
} from "../services/teamApi.js";
import { getUserPublicKey, getUserByEmail } from "../services/userApi.js";
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
  const {
    teamKey,
    encryptedTeamKeyForCreator,
  } = await createNewTeam({ teamName });

  const apiTeam = await createTeam({
    name: teamName,
    encryptedTeamKey: uint8ToBase64(encryptedTeamKeyForCreator),
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

  const teamKeyBytes = await decryptTeamKeyForUser({
    encryptedTeamKeyBytes,
  });

  return {
    teamKeyBytes,
    keyVersion: res.keyVersion ?? 1,
  };
}

/**
 * Thêm member vào team:
 * - decrypt teamKey của admin hiện tại
 * - get publicKey của member mới
 * - encryptTeamKey cho member
 * - gọi addMemberToTeam với userId + encryptedTeamKey
 */
export async function handleAddMemberToTeam(teamId, newMemberEmail) {
  // 0. Từ email -> userId
  const userInfo = await getUserByEmail(newMemberEmail);
  if (!userInfo || !userInfo.id) {
    throw new Error("Cannot find user with email " + newMemberEmail);
  }
  const newMemberUserId = userInfo.id;

  // 1. Lấy encryptedTeamKey cho current user
  const res = await getEncryptedTeamKey(teamId);
  const encryptedTeamKeyBytes = base64ToUint8(res.encryptedTeamKey);

  const teamKeyBytes = await decryptTeamKeyForUser({
    encryptedTeamKeyBytes,
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
  });

  // 4. Gọi API thêm member (giữ nguyên shape body như hiện tại)
  const body = {
    userId: newMemberUserId,
    encryptedTeamKey: uint8ToBase64(encryptedForMember),
  };

  const apiRes = await addMemberToTeam(teamId, body);
  return apiRes;
}

/**
 * Xoá member khỏi team
 * - Chỉ admin/owner mới có quyền
 * - QUAN TRỌNG: Rotate team key sau khi xoá member để member cũ không decrypt được nữa
 * - Gọi DELETE /teams/{teamId}/members/{memberId}
 */
export async function handleRemoveMemberFromTeam(teamId, memberId) {
  // 1. Get team info and current team key
  const team = await getTeamById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  const keyRes = await getEncryptedTeamKey(teamId);
  const encryptedTeamKeyBytes = base64ToUint8(keyRes.encryptedTeamKey);
  const currentKeyVersion = keyRes.keyVersion ?? 1;

  const teamKeyBytes = await decryptTeamKeyForUser({
    encryptedTeamKeyBytes,
  });

  // 2. Get all members and filter out the one being removed
  const currentMembers = team.members || [];
  const remainingMembers = currentMembers.filter(m => m.userId !== memberId);

  if (remainingMembers.length === 0) {
    // No members left, just delete the team instead
    throw new Error('Cannot remove last member. Delete the team instead.');
  }

  // 3. Get public keys for all remaining members
  const membersWithKeys = await Promise.all(
    remainingMembers.map(async (member) => {
      const pkRes = await getUserPublicKey(member.userId);
      if (!pkRes || !pkRes.publicKey) {
        throw new Error(`Cannot load public key for user ${member.userId}`);
      }
      return {
        userId: member.userId,
        publicKey: base64ToUint8(pkRes.publicKey),
      };
    })
  );

  // 4. Rotate team key for remaining members
  const { newTeamKey, encryptedKeysForMembers, keyVersion: newKeyVersion } =
    await rotateTeamKey({
      members: membersWithKeys,
      keyVersion: currentKeyVersion,
    });

  // 5. Update encrypted keys for all remaining members
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

  // 6. Finally remove the member
  const apiRes = await removeMemberFromTeam(teamId, memberId);

  return {
    ...apiRes,
    newKeyVersion,
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
 * (có thể cần thêm service getTeamMembers nếu backend hỗ trợ)
 */
export async function handleGetTeamMembers(teamId) {
  const team = await getTeamById(teamId);
  return team?.members || [];
}