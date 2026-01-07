# 🔐 Encrypted Team Vault - Backend API

ASP.NET Core 8.0 REST API for encrypted team-based password vault with client-side encryption (end-to-end encryption).

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker - Recommended)](#quick-start-docker--recommended)
- [Manual Setup (Host Machine)](#manual-setup-host-machine)
- [API Documentation](#api-documentation)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)

---

## ✨ Features

- ✅ **JWT Authentication** - Secure token-based authentication with refresh tokens
- ✅ **Password Security** - BCrypt hashing with workFactor 12
- ✅ **CORS Support** - Cross-origin requests from web clients
- ✅ **Swagger UI** - Interactive API documentation
- ✅ **Structured Logging** - Serilog with console, debug, and file sinks
- ✅ **Database Migrations** - Entity Framework Core with auto-migrations
- ✅ **Exception Handling** - Centralized exception middleware
- ✅ **Health Checks** - Container health monitoring

## 🛠 Tech Stack

- **Framework**: ASP.NET Core 8.0
- **ORM**: Entity Framework Core 8.0.2
- **Database**: MySQL 8.0
- **Authentication**: JWT Bearer (System.IdentityModel.Tokens.Jwt)
- **Password Hashing**: BCrypt.Net-Next 4.0.3
- **Logging**: Serilog with multiple sinks
- **API Docs**: Swagger/Swashbuckle 6.6.2
- **Containerization**: Docker & Docker Compose

---

## 📦 Prerequisites

### Option 1: Docker (Recommended)

- **Docker Desktop** (v20.10+)
- **Docker Compose** (v2.0+)

### Option 2: Host Machine

- **.NET 8.0 SDK** (or runtime)
- **MySQL Server 8.0+**
- **Entity Framework Core tools** (dotnet-ef)

---

## 🚀 Quick Start (Docker - Recommended)

### 1️⃣ Clone Repository

```bash
git clone https://github.com/dung2711/encrypted-team-vault.git
cd encrypted-team-vault/backend/ETV/ETV
```

### 2️⃣ Configure Environment

Copy `.env.example` to `.env` and update values (optional - defaults work):

```bash
cp .env.example .env
```

Default `.env` values:

```properties
MYSQL_ROOT_PASSWORD=123456789
MYSQL_DATABASE=etv_db
MYSQL_HOST=mysql
MYSQL_PORT=3306
API_PORT=5001
JWT__SECRET_KEY=your-super-secret-key-at-least-32-characters-long-for-hs256
JWT__ISSUER=encrypted-team-vault-api
JWT__AUDIENCE=encrypted-team-vault-client
JWT__EXPIRATION_MINUTES=60
```

### 3️⃣ Start Services (with Database Migration)

```bash
# Step 1: Start MySQL and API (without running migrations yet)
docker-compose up --build -d

# Step 2: Run database migrations with migrate profile
docker-compose --profile migrate up db-migrator

# Step 3: Check if migration completed successfully
docker logs etv_migrator

# Step 4: Verify API is running
curl http://localhost:5001/health
```

Or do it in one command:

```bash
# Start all services including migration
docker-compose --profile migrate up --build
```

This will:

1. ✅ Build and start MySQL database container
2. ✅ Wait for MySQL to be healthy
3. ✅ Run db-migrator service with migrations (profile: migrate)
4. ✅ Start ASP.NET Core API on `http://localhost:5001`

**Note**: The `db-migrator` service only runs when you use `--profile migrate` flag

### 5️⃣ Access API

- **Swagger UI**: http://localhost:5001/swagger
- **API Base**: http://localhost:5001/api

### 6️⃣ Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v

# Stop only API (keep database running)
docker-compose stop api

# Stop only database
docker-compose stop mysql
```

---

## 🔄 Common Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View logs
docker-compose logs -f api              # API logs
docker-compose logs -f mysql            # MySQL logs
docker-compose logs etv_migrator        # Migration logs

# Rebuild images
docker-compose build --no-cache

# Execute command in running container
docker exec -it etv_mysql mysql -u root -p123456789 -e "SHOW DATABASES;"
docker exec -it etv_api bash

# Restart services
docker-compose restart

# Remove unused volumes/networks
docker system prune -a
```

---

## 🗄️ Database Migrations

### Run migrations only

```bash
# Run migrations without starting API
docker-compose --profile migrate up db-migrator

# View migration logs
docker logs etv_migrator

# After migration, you can start API separately
docker-compose up api
```

### Manual migration (Host Machine)

```bash
cd ETV

# Update database with pending migrations
dotnet ef database update

# View migration history
dotnet ef migrations list

# Create new migration after model changes
dotnet ef migrations add MigrationName
dotnet ef database update

# Revert to previous migration
dotnet ef database update PreviousMigrationName

# Remove last migration
dotnet ef migrations remove
```

---

## 💻 Manual Setup (Host Machine)

### 1️⃣ Prerequisites

Install required tools:

```bash
# .NET 8.0 SDK
# Download from: https://dotnet.microsoft.com/en-us/download/dotnet/8.0

# MySQL Server
# Download from: https://dev.mysql.com/downloads/mysql/

# Entity Framework Core Tools
dotnet tool install --global dotnet-ef --version 8.0.2
```

### 2️⃣ Configure MySQL

Start MySQL server:

```bash
# Windows (if installed as service)
net start MySQL80

# macOS (if using Homebrew)
brew services start mysql

# Linux (if using systemd)
sudo systemctl start mysql
```

Create database and user:

```bash
mysql -u root -p

# In MySQL prompt:
CREATE DATABASE etv_db;
CREATE USER 'root'@'localhost' IDENTIFIED BY '123456789';
GRANT ALL PRIVILEGES ON etv_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3️⃣ Configure Environment

Create `.env` file in `ETV/` directory:

```properties
# MySQL Database Configuration
MYSQL_ROOT_PASSWORD=123456789
MYSQL_DATABASE=etv_db
MYSQL_HOST=localhost
MYSQL_PORT=3306

# API Configuration
API_PORT=5001
ASPNETCORE_ENVIRONMENT=Development

# JWT Settings
JWT__SECRET_KEY="your-super-secret-key-at-least-32-characters-long-for-hs256"
JWT__ISSUER="encrypted-team-vault-api"
JWT__AUDIENCE="encrypted-team-vault-client"
JWT__EXPIRATION_MINUTES=60

# Database Connection String
DATABASE_CONNECTION_STRING=Server=localhost;Port=3306;Database=etv_db;user=root;password=123456789;
```

### 4️⃣ Run Database Migrations

```bash
cd ETV

# Update database with migrations
dotnet ef database update

# Or create initial migration if needed
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 5️⃣ Start API Server

```bash
# Development mode with hot reload
dotnet watch run

# OR production mode
dotnet run
```

API will be available at: `http://localhost:5001`

### 6️⃣ Access API

- **Swagger UI**: http://localhost:5001/swagger
- **API Base**: http://localhost:5001/api

---

## 🔗 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with credentials
POST   /api/auth/refresh           - Refresh access token
POST   /api/auth/logout            - Logout (invalidate refresh token)
POST   /api/auth/change-password   - Change password [PROTECTED]
```

### User Endpoints

```
GET    /api/users/{id}             - Get user profile [PROTECTED]
GET    /api/users/{id}/key         - Get key materials [PROTECTED]
```

### Team Endpoints

```
POST   /api/teams                  - Create team [PROTECTED]
GET    /api/teams/{id}             - Get team [PROTECTED]
PUT    /api/teams/{id}             - Update team [PROTECTED]
DELETE /api/teams/{id}             - Delete team [PROTECTED]
POST   /api/teams/{id}/members     - Add team member [PROTECTED]
DELETE /api/teams/{id}/members/{userId} - Remove member [PROTECTED]
PUT    /api/teams/{id}/keys        - Update team keys [PROTECTED]
```

### Vault Item Endpoints

```
POST   /api/items                  - Create vault item [PROTECTED]
GET    /api/items/{id}             - Get vault item [PROTECTED]
PUT    /api/items/{id}             - Update vault item [PROTECTED]
DELETE /api/items/{id}             - Delete vault item [PROTECTED]
GET    /api/items/team/{teamId}    - List team items [PROTECTED]
```

**[PROTECTED]** = Requires valid JWT token in Authorization header

### Example API Call

```bash
# Register
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "password": "securepassword123",
    "publicKey": "-----BEGIN PUBLIC KEY-----...",
    "encryptedPrivateKey": "base64encoded...",
    "kdfSalt": "base64encoded..."
  }'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "securepassword123"
  }'

# Protected endpoint with token
curl -X GET http://localhost:5001/api/users/john \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## 🔐 Environment Configuration

### .env Variables

| Variable                     | Default                       | Description                              |
| ---------------------------- | ----------------------------- | ---------------------------------------- |
| `MYSQL_ROOT_PASSWORD`        | `123456789`                   | MySQL root password                      |
| `MYSQL_DATABASE`             | `etv_db`                      | Database name                            |
| `MYSQL_HOST`                 | `mysql`                       | MySQL host (docker) / `localhost` (host) |
| `MYSQL_PORT`                 | `3306`                        | MySQL port                               |
| `API_PORT`                   | `5001`                        | API port                                 |
| `ASPNETCORE_ENVIRONMENT`     | `Development`                 | Environment (Development/Production)     |
| `JWT__SECRET_KEY`            | Generated                     | JWT signing key (min 32 chars)           |
| `JWT__ISSUER`                | `encrypted-team-vault-api`    | JWT issuer                               |
| `JWT__AUDIENCE`              | `encrypted-team-vault-client` | JWT audience                             |
| `JWT__EXPIRATION_MINUTES`    | `60`                          | Access token lifetime                    |
| `DATABASE_CONNECTION_STRING` | varies                        | Full connection string                   |
