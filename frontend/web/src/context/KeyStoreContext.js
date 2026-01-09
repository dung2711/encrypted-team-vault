import { createContext, useContext, useState, useRef } from "react";

const KeyStoreContext = createContext();

/**
 * React context wrapper for keyStore
 * Stores encryption keys in memory only
 */
export const KeyStoreProvider = ({ children }) => {
    const [isUnlocked, setIsUnlocked] = useState(false);

    // Use ref to store keys (doesn't trigger re-renders)
    const keysRef = useRef({
        userAsymmetricKeyPair: null,
        userSymmetricKey: null,
        teamKeys: {} // Cache decrypted team keys: { teamId: teamKeyBytes }
    });

    const setUserKeys = ({ publicKey, privateKey, symmetricKey }) => {
        keysRef.current.userAsymmetricKeyPair = { publicKey, privateKey };
        keysRef.current.userSymmetricKey = symmetricKey;
        setIsUnlocked(true);
    };

    const getUserKeys = () => {
        return {
            asymmetricKeyPair: keysRef.current.userAsymmetricKeyPair,
            symmetricKey: keysRef.current.userSymmetricKey
        };
    };

    const setTeamKey = (teamId, teamKeyBytes) => {
        keysRef.current.teamKeys[teamId] = teamKeyBytes;
    };

    const getTeamKey = (teamId) => {
        return keysRef.current.teamKeys[teamId];
    };

    const clearAllKeys = () => {
        keysRef.current = {
            userAsymmetricKeyPair: null,
            userSymmetricKey: null,
            teamKeys: {}
        };
        setIsUnlocked(false);
    };

    const value = {
        isUnlocked,
        setUserKeys,
        getUserKeys,
        setTeamKey,
        getTeamKey,
        clearAllKeys
    };

    return (
        <KeyStoreContext.Provider value={value}>
            {children}
        </KeyStoreContext.Provider>
    );
};

export const useKeyStore = () => {
    const context = useContext(KeyStoreContext);
    if (!context) {
        throw new Error('useKeyStore must be used within KeyStoreProvider');
    }
    return context;
};
