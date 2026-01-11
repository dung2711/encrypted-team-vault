// frontend/flows/authFlow.js

import { Buffer } from 'buffer';
import { login, register, logout as logoutApi } from "../services/authApi.js";
import { prepareRegistrationPayload } from "../protocol/userProtocol.js";
import { deriveUserKeysWhenLogin, clearUserKeys } from "../protocol/authProtocol.js";
import { tokenStore } from "../api/tokenStore.js";

const base64ToUint8 = (base64) =>
  new Uint8Array(Buffer.from(base64, "base64"));

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