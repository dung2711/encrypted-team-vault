import axios from 'axios';
import { tokenStore } from './tokenStore.js';

const apiClient = axios.create({
    baseURL: 'http://localhost:4000', // Replace with your API base URL
    timeout: 10000, // Request timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default apiClient;