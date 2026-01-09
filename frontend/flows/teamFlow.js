import {
  createTeam,
  getTeams,
  getTeamById,
  addMemberToTeam,
  getEncryptedTeamKey,
} from "../services/teamApi.js";
import { getUserPublicKey, getUserByEmail } from "../services/userApi.js";
import {
  createNewTeam,
  decryptTeamKeyForUser,
  prepareTeamKeyForNewMember,
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

  const apiTeam = await createTeam(
    teamName,
    uint8ToBase64(encryptedTeamKeyForCreator)
  );

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