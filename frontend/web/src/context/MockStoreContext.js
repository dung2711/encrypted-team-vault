import { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from 'uuid';

const MockStoreContext = createContext();

/**
 * Mock store for development without backend
 * All data is kept in memory and resets on refresh
 */
export const MockStoreProvider = ({ children }) => {
    // Current user
    const [currentUser, setCurrentUser] = useState(null);

    // Mock users database
    const [users, setUsers] = useState([]);

    // Mock teams database
    const [teams, setTeams] = useState([]);

    // Mock team memberships
    const [teamMembers, setTeamMembers] = useState([]);

    // Mock personal items
    const [personalItems, setPersonalItems] = useState([]);

    // Mock team items
    const [teamItems, setTeamItems] = useState([]);

    // ========== USER OPERATIONS ==========
    const registerUser = ({ username, email, password, publicKey, kdfSalt }) => {
        const existingUser = users.find(u => u.username === username || u.email === email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const newUser = {
            id: uuidv4(),
            username,
            email,
            password, // In real app this would be hashed
            publicKey,
            kdfSalt,
            createdAt: new Date().toISOString()
        };

        setUsers(prev => [...prev, newUser]);
        return newUser;
    };

    const loginUser = (username, password) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        setCurrentUser(user);
        return user;
    };

    const logoutUser = () => {
        setCurrentUser(null);
    };

    const getUserPublicKey = (userId) => {
        const user = users.find(u => u.id === userId);
        return user?.publicKey;
    };

    const searchUsers = (query) => {
        if (!query) return [];
        return users.filter(u =>
            u.id !== currentUser?.id &&
            (u.username.toLowerCase().includes(query.toLowerCase()) ||
                u.email.toLowerCase().includes(query.toLowerCase()))
        );
    };

    // ========== TEAM OPERATIONS ==========
    const createTeam = ({ teamName, encryptedTeamKeyForCreator }) => {
        const newTeam = {
            id: uuidv4(),
            name: teamName,
            createdBy: currentUser.id,
            createdAt: new Date().toISOString()
        };

        setTeams(prev => [...prev, newTeam]);

        // Add creator as admin
        const membership = {
            teamId: newTeam.id,
            userId: currentUser.id,
            encryptedTeamKey: encryptedTeamKeyForCreator,
            role: 'admin',
            keyVersion: 1,
            joinedAt: new Date().toISOString()
        };

        setTeamMembers(prev => [...prev, membership]);

        return newTeam;
    };

    const getJoinedTeams = () => {
        const userTeamIds = teamMembers
            .filter(m => m.userId === currentUser?.id)
            .map(m => m.teamId);
        return teams.filter(t => userTeamIds.includes(t.id));
    };

    const getTeamById = (teamId) => {
        return teams.find(t => t.id === teamId);
    };

    const getTeamMembers = (teamId) => {
        return teamMembers
            .filter(m => m.teamId === teamId)
            .map(m => ({
                ...m,
                user: users.find(u => u.id === m.userId)
            }));
    };

    const getEncryptedTeamKey = (teamId) => {
        const membership = teamMembers.find(
            m => m.teamId === teamId && m.userId === currentUser?.id
        );
        return membership?.encryptedTeamKey;
    };

    const addMemberToTeam = ({ teamId, userId, encryptedTeamKey, role = 'member' }) => {
        const existing = teamMembers.find(m => m.teamId === teamId && m.userId === userId);
        if (existing) {
            throw new Error('User is already a member');
        }

        const currentKeyVersion = teamMembers.find(m => m.teamId === teamId)?.keyVersion || 1;

        const membership = {
            teamId,
            userId,
            encryptedTeamKey,
            role,
            keyVersion: currentKeyVersion,
            joinedAt: new Date().toISOString()
        };

        setTeamMembers(prev => [...prev, membership]);
        return membership;
    };

    const removeMemberFromTeam = (teamId, userId) => {
        setTeamMembers(prev => prev.filter(m => !(m.teamId === teamId && m.userId === userId)));
    };

    const isTeamAdmin = (teamId) => {
        const membership = teamMembers.find(
            m => m.teamId === teamId && m.userId === currentUser?.id
        );
        return membership?.role === 'admin';
    };

    const updateTeam = (teamId, updates) => {
        setTeams(prev => prev.map(team =>
            team.id === teamId
                ? { ...team, ...updates, updatedAt: new Date().toISOString() }
                : team
        ));
    };

    const deleteTeam = (teamId) => {
        setTeams(prev => prev.filter(t => t.id !== teamId));
        setTeamMembers(prev => prev.filter(m => m.teamId !== teamId));
        setTeamItems(prev => prev.filter(i => i.teamId !== teamId));
    };

    const updateUser = (userId, updates) => {
        setUsers(prev => prev.map(user =>
            user.id === userId
                ? { ...user, ...updates, updatedAt: new Date().toISOString() }
                : user
        ));
        if (currentUser?.id === userId) {
            setCurrentUser(prev => ({ ...prev, ...updates }));
        }
    };

    // ========== PERSONAL ITEMS ==========
    const createPersonalItem = (itemData) => {
        const newItem = {
            id: uuidv4(),
            userId: currentUser.id,
            ...itemData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setPersonalItems(prev => [...prev, newItem]);
        return newItem;
    };

    const getUserPersonalItems = () => {
        return personalItems.filter(i => i.userId === currentUser?.id);
    };

    const updatePersonalItem = (itemId, updates) => {
        setPersonalItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                : item
        ));
    };

    const deletePersonalItem = (itemId) => {
        setPersonalItems(prev => prev.filter(i => i.id !== itemId));
    };

    // ========== TEAM ITEMS ==========
    const createTeamItem = (itemData) => {
        const newItem = {
            id: uuidv4(),
            createdBy: currentUser.id,
            ...itemData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        setTeamItems(prev => [...prev, newItem]);
        return newItem;
    };

    const getTeamItems = (teamId) => {
        return teamItems.filter(i => i.teamId === teamId);
    };

    const updateTeamItem = (itemId, updates) => {
        setTeamItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, ...updates, updatedAt: new Date().toISOString() }
                : item
        ));
    };

    const deleteTeamItem = (itemId) => {
        setTeamItems(prev => prev.filter(i => i.id !== itemId));
    };

    const value = {
        // State
        currentUser,
        users,
        teams,

        // User operations
        registerUser,
        loginUser,
        logoutUser,
        getUserPublicKey,
        searchUsers,

        // Team operations
        createTeam,
        getJoinedTeams,
        getTeamById,
        getTeamMembers,
        getEncryptedTeamKey,
        addMemberToTeam,
        removeMemberFromTeam,
        isTeamAdmin,
        updateTeam,
        deleteTeam,
        updateUser,

        // Personal items
        createPersonalItem,
        getUserPersonalItems,
        updatePersonalItem,
        deletePersonalItem,

        // Team items
        createTeamItem,
        getTeamItems,
        updateTeamItem,
        deleteTeamItem,
    };

    return (
        <MockStoreContext.Provider value={value}>
            {children}
        </MockStoreContext.Provider>
    );
};

export const useMockStore = () => {
    const context = useContext(MockStoreContext);
    if (!context) {
        throw new Error('useMockStore must be used within MockStoreProvider');
    }
    return context;
};
