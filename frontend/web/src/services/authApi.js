import apiClient from "../api/axios.js";

export const login = async (username, password) => {
    try {
        const response = await apiClient.post('/auth/login', {
            username,
            password
        });
        return response.data;
    } catch (error) {
        console.error('Login API error:', error);
        if (error.response) {
            // Server responded with error status
            throw new Error(error.response.data?.message || 'Login failed');
        } else if (error.request) {
            // Request made but no response (CORS, network, etc.)
            throw new Error('Cannot connect to server. Please check if backend is running.');
        } else {
            throw new Error(error.message || 'Login failed');
        }
    }
}

export const register = async (registrationPayload) => {
    try {
        const response = await apiClient.post('/auth/register', registrationPayload);
        return response.data;
    } catch (error) {
        console.error('Register API error:', error);
        if (error.response) {
            throw new Error(error.response.data?.message || 'Registration failed');
        } else if (error.request) {
            throw new Error('Cannot connect to server. Please check if backend is running.');
        } else {
            throw new Error(error.message || 'Registration failed');
        }
    }
}

export const logout = async () => {
    try {
        const response = await apiClient.post('/auth/logout');
        return response.data;
    } catch (error) {
        console.error('Logout API error:', error);
        // Logout errors can be safely ignored
        return null;
    }
}