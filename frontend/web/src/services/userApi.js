import apiClient from "../api/axios";

export const getUserInfo = async (id) => {
    try {
        const response = await apiClient.get(`/user/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to get user info:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to get user info');
    }
}
export const getUserByEmail = async (email) => {
    try {
        const response = await apiClient.get(`/user/by-email`, {
            params: { email },
        });
        return response.data;
    } catch (error) {
        console.error('Failed to get user by email:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'User not found with this email');
    }
};
export const updateUserInfo = async (id, userInfo) => {
    try {
        const response = await apiClient.put(`/user/${id}`, userInfo);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const getUserPublicKey = async (userId) => {
    try {
        const response = await apiClient.get(`/user/${userId}/publickey`);
        return response.data;  // Returns { userId, publicKey }
    } catch (error) {
        console.error('Failed to get user public key:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to get user public key');
    }
}