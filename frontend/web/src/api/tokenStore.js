const TOKEN_KEY = 'accessToken';

export const tokenStore = {
    set(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        }
    },
    get() {
        return localStorage.getItem(TOKEN_KEY);
    },
    clear() {
        localStorage.removeItem(TOKEN_KEY);
    }
}