import apiClient from "../api/axios.js";

export const login = async (username, password) => {
    try {
        const response = await apiClient.post('/auth/login', {
            username,
            password
        });
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const register = async (registrationPayload) => {
    try {
        const response = await apiClient.post('/auth/register', registrationPayload);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const logout = async () => {
    try {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    } catch (error) {
        return error.msg;
    }
}