import apiClient from "../api/axios";

export const createTeamItem = async ({ teamId, encryptedBlob, encryptedItemKey, keyVersion }) => {
    try {
        const response = await apiClient.post(`/teams/${teamId}/items`, {
            encryptedBlob,
            encryptedItemKey,
            keyVersion
        });
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getTeamItems = async (teamId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}/items`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getTeamItemById = async (teamId, itemId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}/items/${itemId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const updateTeamItem = async ({ teamId, itemId, encryptedBlob, encryptedItemKey, keyVersion }) => {
    try {
        const response = await apiClient.put(`/teams/${teamId}/items/${itemId}`, {
            encryptedBlob,
            encryptedItemKey,
            keyVersion
        });
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const deleteTeamItem = async (teamId, itemId) => {
    try {
        const response = await apiClient.delete(`/teams/${teamId}/items/${itemId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const createPersonalItem = async ({ encryptedBlob, encryptedItemKey, keyVersion }) => {
    try {
        const response = await apiClient.post(`/user/items`, {
            encryptedBlob,
            encryptedItemKey,
            keyVersion
        });
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getPersonalItems = async () => {
    try {
        const response = await apiClient.get(`/user/items`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getPersonalItemById = async (itemId) => {
    try {
        const response = await apiClient.get(`/user/items/${itemId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const updatePersonalItem = async ({ itemId, encryptedBlob, encryptedItemKey, keyVersion }) => {
    try {
        const response = await apiClient.put(`/user/items/${itemId}`, {
            encryptedBlob,
            encryptedItemKey,
            keyVersion
        });
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const deletePersonalItem = async (itemId) => {
    try {
        const response = await apiClient.delete(`/user/items/${itemId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}