import apiClient from "../api/axios";

export const createTeam = async (teamData) => {
    try {
        const response = await apiClient.post('/teams', teamData);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const getTeams = async (userId) => {
    try {
        const response = await apiClient.get(`/teams/`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const getTeamById = async (teamId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const addMemberToTeam = async (teamId, memberId, encryptedTeamKey) => {
    try {
        const response = await apiClient.post(
            `/teams/${teamId}/members/${memberId}`,
            { encryptedTeamKey }
        );
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const removeMemberFromTeam = async (teamId, memberId) => {
    try {
        const response = await apiClient.delete(`/teams/${teamId}/members/${memberId}`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const deleteTeam = async (teamId) => {
    try {
        const response = await apiClient.delete(`/teams/${teamId}`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const getEncryptedTeamKey = async (teamId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}/keys`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}

export const updateTeamKeyFor1Member = async (teamId, memberId, keyVersion, encryptedTeamKey) => {
    try {
        const response = await apiClient.put(
            `/teams/${teamId}/members/${memberId}/key`,
            { encryptedTeamKey, keyVersion }
        );
        return response.data;
    } catch (error) {
        console.log(error);
    }
}
export const getTeamMembers = async (teamId) => {
    try {
        const response = await apiClient.get(`/teams/${teamId}/members`);
        return response.data;
    } catch (error) {
        console.log(error);
    }
}