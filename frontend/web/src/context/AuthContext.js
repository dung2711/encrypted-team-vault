import { createContext, useContext, useState, useEffect } from "react";
import { login as loginUser, logout as logoutUser } from "../../../services/authApi.js";
import { tokenStore } from "../../../api/tokenStore.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [role, setRole] = useState(null);
    const [token, setToken] = useState(null);

    const login = async (username, password) => {
        const response = await loginUser(username, password);
        if (response.token) {
            setToken(response.token);
            setRole(response.role);
            tokenStore.set(response.token);
        }
        return response;
    }

    const logout = async () => {
        const response = await logoutUser();
        setToken(null);
        setRole(null);
        tokenStore.clear();
        return response;
    }

    return (
        <AuthContext.Provider value={{ role, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    return useContext(AuthContext);
}