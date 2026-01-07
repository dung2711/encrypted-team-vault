class KeyStore {
    constructor() {
        this.userAsymmetricKeyPair = {};
        this.userSymmetricKey = null;
    }
}

export const keyStore = new KeyStore();