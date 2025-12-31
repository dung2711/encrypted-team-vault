let accessToken = null;

export const tokenStore = {
    set(token) {
        accessToken = token;
    },
    get() {
        return accessToken;
    },
    clear() {
        accessToken = null;
    }
}