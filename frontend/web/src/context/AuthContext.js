import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { handleLogin, handleRegistration, handleLogout } from "../flows/authFlow.js";

const AuthContext = createContext();

/**
 * Authentication context using actual flow functions
 * Manages user session and integrates with crypto key derivation
 */
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing session on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem('currentUser');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (username, password) => {
        const result = await handleLogin({ username, password });

        const user = {
            id: result.userId,
            username: result.username || username,
            email: result.email,
            accessToken: result.accessToken,
            kdfSalt: result.kdfSalt,
        };

        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));

        return result;
    }, []);

    const register = useCallback(async ({ username, email, password, autoLogin = false }) => {
        const result = await handleRegistration({
            username,
            email,
            password,
            autoLogin
        });

        if (autoLogin && result) {
            const user = {
                id: result.userId,
                username: result.username || username,
                email: result.email || email,
                accessToken: result.accessToken,
            };
            setCurrentUser(user);
            localStorage.setItem('currentUser', JSON.stringify(user));
        }

        return result;
    }, []);

    const logout = useCallback(async () => {
        try {
            await handleLogout();
        } catch (e) {
            // Ignore logout API errors, still clear local state
        }

        setCurrentUser(null);
        localStorage.removeItem('currentUser');
    }, []);

    const value = {
        currentUser,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!currentUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};