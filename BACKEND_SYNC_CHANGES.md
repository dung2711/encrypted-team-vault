# Backend Changes Required to Sync with Frontend

This document outlines the backend API changes needed to support client-generated IDs for teams and items.

## Overview

The frontend now generates `teamId` and `itemId` on the client side using UUIDv4. This is required for the end-to-end encryption protocol because these IDs are used as part of the encryption context (AAD - Additional Authenticated Data) before the backend response is available.

---

## 1. Create Team

### Endpoint
`POST /teams`

### Previous Request Body
```json
{
  "name": "Team Name",
  "encryptedTeamKey": "base64-encoded-encrypted-key"
}
```

### New Request Body
```json
{
  "id": "uuid-v4-generated-by-frontend",
  "name": "Team Name",
  "encryptedTeamKey": "base64-encoded-encrypted-key"
}
```

### Backend Changes
- Accept `id` field from request body
- Validate that `id` is a valid UUID format
- Check for uniqueness (reject if ID already exists)
- Use the provided `id` instead of generating one server-side

---

## 2. Create Team Item

### Endpoint
`POST /teams/{teamId}/items`

### Previous Request Body
```json
{
  "encryptedBlob": "base64-encoded-iv+ciphertext",
  "encryptedItemKey": "base64-encoded-iv+encrypted-key",
  "keyVersion": 1
}
```

### New Request Body
```json
{
  "id": "uuid-v4-generated-by-frontend",
  "encryptedBlob": "base64-encoded-iv+ciphertext",
  "encryptedItemKey": "base64-encoded-iv+encrypted-key",
  "keyVersion": 1
}
```

### Backend Changes
- Accept `id` field from request body
- Validate that `id` is a valid UUID format
- Check for uniqueness within the team (reject if ID already exists)
- Use the provided `id` instead of generating one server-side

---

## 3. Create Personal Item

### Endpoint
`POST /user/items`

### Previous Request Body
```json
{
  "encryptedBlob": "base64-encoded-iv+ciphertext",
  "encryptedItemKey": "base64-encoded-iv+encrypted-key",
  "keyVersion": 1
}
```

### New Request Body
```json
{
  "id": "uuid-v4-generated-by-frontend",
  "encryptedBlob": "base64-encoded-iv+ciphertext",
  "encryptedItemKey": "base64-encoded-iv+encrypted-key",
  "keyVersion": 1
}
```

### Backend Changes
- Accept `id` field from request body
- Validate that `id` is a valid UUID format
- Check for uniqueness for the user (reject if ID already exists)
- Use the provided `id` instead of generating one server-side

---

## Validation Requirements

For all endpoints accepting client-generated IDs:

1. **Format Validation**: Ensure the provided `id` is a valid UUID v4 format
2. **Uniqueness Check**: Return `409 Conflict` if the ID already exists
3. **Required Field**: The `id` field should be required (return `400 Bad Request` if missing)

### Example Error Responses

**Missing ID:**
```json
{
  "error": "Bad Request",
  "message": "Field 'id' is required"
}
```

**Invalid UUID Format:**
```json
{
  "error": "Bad Request", 
  "message": "Field 'id' must be a valid UUID"
}
```

**Duplicate ID:**
```json
{
  "error": "Conflict",
  "message": "Resource with this ID already exists"
}
```

---

## Why Client-Generated IDs?

The `itemId` and `teamId` are embedded in the encryption context (AAD) during the encryption process. This prevents:
- Ciphertext being moved between different items/teams
- Replay attacks where encrypted data is reused

Since encryption happens client-side before the API call, the ID must be known at encryption time, hence client-side generation.

---

## Summary Table

| Endpoint | New Field | Type | Required |
|----------|-----------|------|----------|
| `POST /teams` | `id` | UUID v4 | Yes |
| `POST /teams/{teamId}/items` | `id` | UUID v4 | Yes |
| `POST /user/items` | `id` | UUID v4 | Yes |
