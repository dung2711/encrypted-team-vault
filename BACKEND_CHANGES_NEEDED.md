# Backend Changes Required for Full System Integration

## Critical Changes (Must Fix)

### 1. **Remove `EncryptedPrivateKey` from Database & API**

**Reason:** Private keys are now derived fresh on each login, never stored.

**Changes needed:**
```csharp
// ❌ Remove from User entity
public class User {
    // Remove this:
    // public string EncryptedPrivateKey { get; set; }
}

// ✅ Update RegisterRequest
public class RegisterRequest {
    public required string Username { get; set; }
    public required string Email { get; set; }
    public required string Password { get; set; }
    public required string PublicKey { get; set; }
    public required string KDFSalt { get; set; }
    // Removed: EncryptedPrivateKey
}

// ❌ Remove from GetKeyMaterialsResponse
public class GetKeyMaterialsResponse {
    public required string PublicKey { get; set; }
    public required string KDFSalt { get; set; }
    // Removed: EncryptedPrivateKey
}

// ❌ Remove UpdateEncryptedPrivateKeyAsync from UserService
```

**Database Migration:**
```sql
ALTER TABLE users DROP COLUMN encrypted_private_key;
```

---

### 2. **Add Personal Items Endpoints**

**Current Issue:** Frontend expects `/user/items` endpoints but backend only has team items.

**Option A: Add Personal Items (Recommended)**
```csharp
[ApiController]
[Route("api/user/items")]
[Authorize]
public class PersonalItemController : ControllerBase {
    
    [HttpPost]
    public async Task<IActionResult> CreatePersonalItem([FromBody] CreateItemRequest request) {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value);
        // Create item with userId, no teamId
    }
    
    [HttpGet]
    public async Task<IActionResult> GetPersonalItems() {
        var userId = Guid.Parse(User.FindFirst("sub")?.Value);
        // Get items where teamId is null and userId matches
    }
    
    [HttpGet("{itemId}")]
    public async Task<IActionResult> GetPersonalItem([FromRoute] Guid itemId) { }
    
    [HttpPut("{itemId}")]
    public async Task<IActionResult> UpdatePersonalItem([FromRoute] Guid itemId, [FromBody] UpdateItemRequest request) { }
    
    [HttpDelete("{itemId}")]
    public async Task<IActionResult> DeletePersonalItem([FromRoute] Guid itemId) { }
}
```

**Option B: Use "Personal Vault" Team Pattern**
- Keep only team endpoints
- Frontend creates a special "Personal Vault" team for each user on registration
- Personal items are just items in that team

---

### 3. **Fix Login Flow to Return Salt**

**Current Issue:** Login needs to return salt so frontend can derive keys.

```csharp
[HttpPost("auth/login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request) {
    // Authenticate user
    var user = await _userService.AuthenticateAsync(request.Username, request.Password);
    
    if (user == null) {
        return Unauthorized(new { message = "Invalid credentials" });
    }
    
    // Generate JWT token
    var token = GenerateJwtToken(user);
    
    // ✅ Return salt so frontend can derive keys
    return Ok(new {
        token = token,
        userId = user.Id,
        username = user.Username,
        kdfSalt = user.KDFSalt,  // ← ADD THIS
        publicKey = user.PublicKey  // ← ADD THIS (optional, for verification)
    });
}
```

---

### 4. **Fix Team Endpoints Path Consistency**

**Issue:** Frontend paths don't match backend paths.

**Backend changes:**
```csharp
// ✅ Current (correct):
[HttpGet]  // GET /api/teams - uses JWT to get user's teams
public async Task<IActionResult> GetJoinedTeams()

// ❌ Frontend expects:
// GET /teams/{userId} - but this is less secure, use JWT instead

// ✅ Solution: Frontend should call GET /api/teams (no userId in path)
```

**Frontend changes needed (see section below)**

---

### 5. **Add Endpoint to Get Other User's Public Key**

**Reason:** Admin needs member's public key to encrypt team key for them during invitation.

```csharp
[HttpGet("user/{userId}/publickey")]
[Authorize]
public async Task<IActionResult> GetUserPublicKey([FromRoute] Guid userId) {
    var publicKey = await _userService.GetPublicKeyAsync(userId);
    
    return Ok(new {
        userId = userId,
        publicKey = publicKey
    });
}
```

---

### 6. **Update Team Key Endpoints**

**Current Backend:**
```csharp
[HttpGet("{teamId}/keys")]  // Returns encrypted team key for current user
[HttpPut("{teamId}/keys")]  // Bulk update for rotation
```

**Issue:** Frontend has `updateTeamKeyFor1Member` which doesn't exist in backend.

**Solution:** Either:
- **Option A:** Add single-member update endpoint
```csharp
[HttpPut("{teamId}/members/{userId}/key")]
public async Task<IActionResult> UpdateMemberTeamKey(
    [FromRoute] Guid teamId, 
    [FromRoute] Guid userId,
    [FromBody] UpdateMemberKeyRequest request) {
    // Update encrypted team key for specific member
}
```

- **Option B:** Frontend uses bulk update endpoint with single member array

---

## Frontend Changes Needed


## Missing Flow

### 1. **Login Flow**

**Needed:**
```javascript
// In your flow/auth.js or UI component:
import { login } from './services/authApi.js';
import { deriveUserKeysWhenLogin } from './protocol/authProtocol.js';
import { tokenStore } from './api/tokenStore.js';

async function handleLogin(username, password) {
    // 1. Login to get token, userId, and salt (backend returns all in one response)
    const { token, userId, kdfSalt } = await login(username, password);
    
    // 2. Store token
    tokenStore.set(token);
    
    // 3. Convert salt from base64
    const saltBytes = Uint8Array.from(Buffer.from(kdfSalt, 'base64'));
    
    // 4. Derive keys and store in keyStore
    await deriveUserKeysWhenLogin({ password, salt: saltBytes });
    
    // Now user is fully authenticated and can decrypt data
    return { userId, username };
}
```

### 2. **Registration Flow**

```javascript
import { prepareRegistrationPayload } from './protocol/userProtocol.js';
import { register } from './services/authApi.js';

async function handleRegistration(username, email, password) {
    // 1. Prepare encrypted payload
    const payload = await prepareRegistrationPayload({ username, email, password });
    
    // 2. Send to backend
    const result = await register(payload);
    
    // 3. Auto-login after registration
    if (result.success) {
        await handleLogin(username, password);
    }
}
```

### 3. **Create Team Flow**

```javascript
import { createNewTeam } from './protocol/teamProtocol.js';
import { createTeam } from './services/teamApi.js';

async function handleCreateTeam(teamName) {
    // 1. Generate and encrypt team key
    const { teamName, encryptedTeamKeyForCreator } = await createNewTeam({ teamName });
    
    // 2. Convert to base64
    const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
    
    // 3. Send to backend
    const result = await createTeam({
        teamName,
        encryptedTeamKeyForCreator: toBase64(encryptedTeamKeyForCreator)
    });
    
    return result;
}
```

### 4. **Add Member to Team Flow**

```javascript
import { decryptTeamKeyForUser, prepareTeamKeyForNewMember } from './protocol/teamProtocol.js';
import { getEncryptedTeamKey, getUserPublicKey, addMemberToTeam } from './services/teamApi.js';

async function handleAddMember(teamId, newMemberUserId) {
    // 1. Get encrypted team key for current user (admin)
    const { encryptedTeamKey } = await getEncryptedTeamKey(teamId);
    const encryptedTeamKeyBytes = Uint8Array.from(Buffer.from(encryptedTeamKey, 'base64'));
    
    // 2. Decrypt team key
    const teamKeyBytes = await decryptTeamKeyForUser({ 
        encryptedTeamKeyBytes 
    });
    
    // 3. Get new member's public key
    const { publicKey } = await getUserPublicKey(newMemberUserId);
    const memberPublicKeyBytes = Uint8Array.from(Buffer.from(publicKey, 'base64'));
    
    // 4. Encrypt team key for new member
    const encryptedKeyForMember = await prepareTeamKeyForNewMember({
        teamKeyBytes,
        memberPublicKeyBytes
    });
    
    // 5. Send to backend
    const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
    await addMemberToTeam(teamId, {
        userId: newMemberUserId,
        encryptedTeamKey: toBase64(encryptedKeyForMember)
    });
}
```

### 5. **Create Personal Item Flow**

```javascript
import { createNewPersonalSecret } from './protocol/userProtocol.js';
import { createPersonalItem } from './services/itemApi.js';

async function handleCreatePersonalItem(secret, userId) {
    // 1. Encrypt the secret
    const encrypted = await createNewPersonalSecret({
        secret,
        userId,
        keyVersion: 1
    });
    
    // 2. Combine encrypted data and item key into "blob"
    const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
    
    // 3. Send to backend
    await createPersonalItem({
        encryptedBlob: toBase64(encrypted.encryptedDataBytes),
        encryptedItemKey: toBase64(encrypted.encryptedItemKeyBytes),
        keyVersion: 1
    });
}
```

### 6. **Create Team Item Flow**

```javascript
import { createNewTeamSecret } from './protocol/teamProtocol.js';
import { decryptTeamKeyForUser } from './protocol/teamProtocol.js';
import { getEncryptedTeamKey } from './services/teamApi.js';
import { createTeamItem } from './services/itemApi.js';

async function handleCreateTeamItem(secret, teamId) {
    // 1. Get and decrypt team key
    const { encryptedTeamKey } = await getEncryptedTeamKey(teamId);
    const teamKeyBytes = await decryptTeamKeyForUser({
        encryptedTeamKeyBytes: Uint8Array.from(Buffer.from(encryptedTeamKey, 'base64'))
    });
    
    // 2. Encrypt the secret
    const encrypted = await createNewTeamSecret({
        secret,
        teamId,
        teamKeyBytes,
        keyVersion: 1
    });
    
    // 3. Send to backend
    const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
    await createTeamItem({
        teamId,
        encryptedBlob: toBase64(encrypted.encryptedDataBytes),
        encryptedItemKey: toBase64(encrypted.encryptedItemKeyBytes),
        keyVersion: 1
    });
}
```

---

## Summary Checklist

### Backend Must-Do:
- [ ] Remove `EncryptedPrivateKey` from User entity, API, and database
- [ ] Update `RegisterRequest` to not expect `encryptedPrivateKey`
- [ ] **Add salt and publicKey to login response** (critical for frontend key derivation)
- [ ] Add personal items endpoints OR document "personal vault = team" pattern
- [ ] Add endpoint to get other user's public key (for team invitations)
- [ ] Consider adding single-member team key update endpoint

### Frontend Must-Do:
- [ ] Fix team API endpoint paths to match backend
- [ ] Add `getUserPublicKey` to userApi.js (for team member invitations)
- [ ] Create flow layer that combines protocol + API calls
- [ ] Handle base64 conversions between protocol (Uint8Array) and API (strings)
- [ ] Integrate tokenStore for JWT management

### Optional Improvements:
- [ ] Add keyStore caching for decrypted team keys
- [ ] Add error handling for crypto failures
- [ ] Add loading states during crypto operations
- [ ] Implement session management (auto-logout, vault locking)
- [ ] Add audit logging for sensitive operations
