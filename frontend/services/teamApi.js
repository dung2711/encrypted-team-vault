import apiClient from "../api/axios";

export const createTeam = async (teamData) => {
    try {
        const response = await apiClient.post('/teams', teamData);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getTeams = async (userId) => {
    try {
        const response = await apiClient.get(`/teams/`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getTeamById = async (teamId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const addMemberToTeam = async (teamId, memberData) => {
    try {
        const response = await apiClient.post(`/teams/${teamId}/members`, memberData);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const removeMemberFromTeam = async (teamId, memberId) => {
    try {
        const response = await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const deleteTeam = async (teamId) => {
    try {
        const response = await apiClient.delete(`/teams/${teamId}`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const getEncryptedTeamKey = async (teamId, memberId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}/key`);
        return response.data;
    } catch (error) {
        return error.msg;
    }
}

export const updateTeamKeyFor1Member = async (teamId, memberId, keyVersion, encryptedTeamKey) => {
    try {
        const response = await apiClient.put(`/teams/${teamId}/keys/${keyVersion}/member/${memberId}`, { encryptedTeamKey });
        return response.data;
    } catch (error) {
        return error.msg;
    }
}