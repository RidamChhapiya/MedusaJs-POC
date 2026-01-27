# Redis Setup Guide

## Problem
You're seeing Redis connection errors because Redis is not running on your system. These errors can prevent the admin panel from working properly if Redis is required for sessions or other features.

## Solution Options

### Option 1: Install and Start Redis (Recommended for Production)

#### On macOS (using Homebrew):
```bash
# Install Redis
brew install redis

# Start Redis as a service (starts automatically on boot)
brew services start redis

# Or start Redis manually (for this session only)
redis-server
```

#### Verify Redis is Running:
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### Update your .env file:
Make sure you have:
```bash
REDIS_URL=redis://localhost:6379
```

### Option 2: Remove Redis Temporarily (For Development)

If you don't want to use Redis right now, you can remove or comment out the REDIS_URL from your `.env` file:

```bash
# REDIS_URL=redis://localhost:6379
```

Medusa will automatically use in-memory alternatives for:
- Event Bus (local event bus)
- Caching (in-memory cache)
- Job Queue (in-memory queue)
- Locking (in-memory locks)

**Note**: In-memory alternatives are fine for development but NOT recommended for production.

### Option 3: Use Docker Redis (Alternative)

If you have Docker installed:
```bash
# Run Redis in a Docker container
docker run -d -p 6379:6379 --name redis redis:latest

# Stop Redis
docker stop redis

# Start Redis again
docker start redis
```

## After Installing Redis

1. **Restart your Medusa backend server**:
   ```bash
   npm run dev
   ```

2. **Check that Redis errors are gone** - you should see:
   - No more `[ioredis] Unhandled error event` messages
   - Server starts successfully
   - Admin panel login works

## Troubleshooting

### Redis connection still failing?
1. Check if Redis is actually running:
   ```bash
   redis-cli ping
   ```

2. Check if port 6379 is available:
   ```bash
   lsof -i :6379
   ```

3. Verify your REDIS_URL in .env matches your Redis setup:
   ```bash
   # Default local Redis
   REDIS_URL=redis://localhost:6379
   
   # If Redis has a password
   REDIS_URL=redis://:password@localhost:6379
   
   # If Redis is on a different host/port
   REDIS_URL=redis://hostname:port
   ```

### Admin Panel Still Not Working?

If the admin panel login still doesn't work after fixing Redis:
1. Clear your browser cookies for the admin panel
2. Check browser console for errors
3. Verify CORS settings in medusa-config.ts
4. Check that JWT_SECRET and COOKIE_SECRET are set in .env

## Why Redis?

Redis is used by Medusa for:
- **Event Bus**: Handling events between modules
- **Job Queue**: Background job processing
- **Caching**: Performance optimization
- **Session Storage**: Admin panel sessions (in some configurations)
- **Locking**: Preventing race conditions

For development, you can skip Redis, but for production, it's highly recommended.
