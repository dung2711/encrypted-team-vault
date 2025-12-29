/**
 * Input validation utilities for crypto operations
 */

export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

export function validateUint8Array(value, name, expectedLength = null) {
    if (!(value instanceof Uint8Array)) {
        throw new ValidationError(`${name} must be a Uint8Array`);
    }
    if (value.length === 0) {
        throw new ValidationError(`${name} cannot be empty`);
    }
    if (expectedLength !== null && value.length !== expectedLength) {
        throw new ValidationError(`${name} must be ${expectedLength} bytes, got ${value.length}`);
    }
    return true;
}

export function validateString(value, name) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ValidationError(`${name} must be a non-empty string`);
    }
    return true;
}

export function validateNumber(value, name) {
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
        throw new ValidationError(`${name} must be a valid non-negative number`);
    }
    return true;
}

export function validateObject(value, name) {
    if (!value || typeof value !== 'object') {
        throw new ValidationError(`${name} must be an object`);
    }
    return true;
}
