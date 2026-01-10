import apiClient from "../api/axios";

export const getUserInfo = async (id) => {
    try {
        const response = await apiClient.get(`/user/${id}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}
export const getUserByEmail = async (email) => {
    try {
        const response = await apiClient.get(`/user/by-email`, {
            params: { email },
        });
        return response.data;
    } catch (error) {
        return error.msg;
    }
};
export const updateUserInfo = async (id, userInfo) => {
    try {
        const response = await apiClient.put(`/user/${id}`, userInfo);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getUserPublicKey = async (userId) => {
    try {
        const response = await apiClient.get(`/user/${userId}/publickey`);
        return response.data;  // Returns { userId, publicKey }
    } catch (error) {
        return error.msg;
    }
}