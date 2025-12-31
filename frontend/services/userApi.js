import apiClient from "../api/axios";

export const getUserInfo = async (id) => {
    try {
        const response = await apiClient.get(`/user/${id}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const updateUserInfo = async (id, userInfo) => {
    try {
        const response = await apiClient.put(`/user/${id}`, userInfo);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}