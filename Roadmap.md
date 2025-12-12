# ArchStudio Production Roadmap - 20241219

## Project Overview
Transform ArchStudio from a single-user prototype to a production-ready multi-tenant voice-enabled AI chat application with secure GitHub integration.

### Core Goals
- Multi-user support with GitHub OAuth authentication
- Secure token storage and management
- Production-grade infrastructure on VPS with Docker/Kamal
- Usage tracking and rate limiting
- Data persistence and session management

## Architecture Decisions

### Authentication & Security
- **GitHub OAuth** for user authentication (repo + actions scopes)
- **Redis** for session management (server-side sessions)
- **PostgreSQL** for data persistence
- **AES-GCM encryption** for GitHub tokens (using Node.js crypto module)
- Master key stored in environment variables

### Infrastructure
- **VPS deployment** with Docker containers
- **Kamal** for orchestration
- **PostgreSQL** and **Redis** running locally on VPS
- **Prometheus metrics** endpoint for monitoring

---

## Issue: Set Up PostgreSQL Database Schema

**Priority:** High
**Dependencies:** None

### Description
Create the initial database schema with tables for users, sessions, chats, artifacts, preferences, and usage tracking.

### Acceptance Criteria
- [ ] Users table with id, github_id, username, created_at
- [ ] Encrypted tokens table with user_id, encrypted_token, iv, created_at
- [ ] Chat sessions table with id, user_id, title, created_at, updated_at
- [ ] Messages table with id, session_id, role, content, created_at
- [ ] Artifacts table with id, session_id, identifier, type, title, content
- [ ] User preferences table (JSON field for flexibility)
- [ ] Usage tracking table with user_id, date, api_calls, tokens_used

### Technical Approach
- Use migrations for schema versioning
- Add indexes on foreign keys and frequently queried fields
- Set up CASCADE deletes for chat sessions
- Implement 30-day retention policy

@claude

---

## Issue: Implement GitHub OAuth Authentication Flow

**Priority:** High
**Dependencies:** Database schema

### Description
Set up GitHub OAuth with proper token storage and session management using Redis.

### Acceptance Criteria
- [ ] OAuth app registered on GitHub with callback URL
- [ ] Express endpoints for /api/auth/github and /api/auth/github/callback
- [ ] Token encryption using AES-GCM with master key from env
- [ ] Redis session storage with secure cookie configuration
- [ ] Logout endpoint that clears session and cookie

### Technical Approach
- Use passport-github2 for OAuth flow
- Store encrypted tokens with user-specific IV
- Set secure, httpOnly, sameSite cookies
- Configure session expiry (7 days default)

@claude

---

## Issue: Update Frontend for Multi-User Support

**Priority:** High
**Dependencies:** GitHub OAuth implementation

### Description
Modify React frontend to handle authentication state and protect routes.

### Acceptance Criteria
- [ ] Login page with GitHub OAuth button
- [ ] Protected routes that redirect to login
- [ ] User context with authentication state
- [ ] Logout functionality in UI
- [ ] Handle expired sessions gracefully

### Technical Approach
- Create AuthProvider context
- Use React Router for protected routes
- Store minimal user info in context
- Check auth on app mount

@claude

---

## Issue: Secure API Endpoints and WebSocket Connections

**Priority:** High
**Dependencies:** Authentication system

### Description
Add authentication checks to all API endpoints, WebSocket, and SSE connections.

### Acceptance Criteria
- [ ] Middleware to verify Redis sessions on all API routes
- [ ] WebSocket upgrade authentication check
- [ ] SSE connection authentication
- [ ] Proper 401 responses for unauthorized requests
- [ ] CORS configuration for production domain

### Technical Approach
- Create auth middleware that checks Redis
- Extract session from cookie on WS upgrade
- Add auth check to SSE endpoint
- Configure CORS for engineeringloop.com only

@claude

---

## Issue: Implement Per-User API Usage Tracking

**Priority:** Medium
**Dependencies:** Database schema, Authentication

### Description
Track API usage per user and implement rate limiting with daily quotas.

### Acceptance Criteria
- [ ] Increment usage counter on each Claude API call
- [ ] Daily usage limits (configurable per user)
- [ ] Reset counters at midnight UTC
- [ ] Return 429 when limit exceeded
- [ ] Usage stats endpoint for users

### Technical Approach
- Middleware to track API calls
- PostgreSQL function for atomic increment
- Scheduled job for daily reset
- Cache current usage in Redis for performance

@claude

---

## Issue: Add Production Error Handling and Logging

**Priority:** Medium
**Dependencies:** Basic infrastructure

### Description
Implement comprehensive error handling and logging for production debugging.

### Acceptance Criteria
- [ ] Centralized error handling middleware
- [ ] Structured logging with winston
- [ ] Log rotation (daily, 7 day retention)
- [ ] Error boundaries in React
- [ ] User-friendly error messages

### Technical Approach
- Winston with file transport
- Separate error and access logs
- Sanitize sensitive data from logs
- Client-side error reporting

@claude

---

## Issue: Create Health Check and Metrics Endpoints

**Priority:** Medium
**Dependencies:** Basic infrastructure

### Description
Implement health checks and Prometheus-compatible metrics endpoint.

### Acceptance Criteria
- [ ] /health endpoint checking DB, Redis connectivity
- [ ] /metrics endpoint with Prometheus format
- [ ] Metrics: total users, active sessions, API calls, DB size
- [ ] Response time histograms
- [ ] Custom business metrics

### Technical Approach
- Use prom-client library
- Expose standard and custom metrics
- Add middleware for response time tracking
- Include version info in health check

@claude

---

## Issue: Set Up Docker Compose for Local Development

**Priority:** Medium
**Dependencies:** None

### Description
Create Docker setup that mirrors production environment for testing.

### Acceptance Criteria
- [ ] docker-compose.yml with all services
- [ ] Environment variable configuration
- [ ] Volume mounts for persistence
- [ ] Development vs production configs
- [ ] README with setup instructions

### Technical Approach
- Node app, PostgreSQL, Redis containers
- Use .env files for configuration
- Named volumes for data persistence
- Health checks for service dependencies

@claude

---

## Issue: Implement Security Headers and Best Practices

**Priority:** Medium
**Dependencies:** Basic infrastructure

### Description
Add security headers and implement OWASP best practices.

### Acceptance Criteria
- [ ] Helmet.js with strict CSP
- [ ] HSTS, X-Frame-Options headers
- [ ] Rate limiting on auth endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention

### Technical Approach
- Configure Helmet with production settings
- Use express-rate-limit on sensitive endpoints
- Parameterized queries only
- Input validation with joi or zod

@claude

---

## Issue: Create Database Backup Strategy

**Priority:** Low
**Dependencies:** PostgreSQL setup

### Description
Implement automated backups for PostgreSQL data.

### Acceptance Criteria
- [ ] Daily automated backups
- [ ] 7-day retention policy
- [ ] Backup verification script
- [ ] Restore documentation
- [ ] Backup monitoring

### Technical Approach
- Cron job with pg_dump
- Compress and timestamp backups
- Store on separate volume
- Test restore procedure

@claude

---

## Issue: Add User Preferences System

**Priority:** Low
**Dependencies:** Database schema

### Description
Implement user preferences storage for future features.

### Acceptance Criteria
- [ ] API endpoints for get/update preferences
- [ ] Default preferences structure
- [ ] Preference validation
- [ ] UI settings page (basic)
- [ ] Preference versioning

### Technical Approach
- JSONB field in PostgreSQL
- Schema validation on updates
- Merge with defaults on retrieval
- Cache in Redis for performance

@claude

---

## Issue: Optimize Frontend Performance

**Priority:** Low
**Dependencies:** Multi-user support

### Description
Optimize React app for production performance.

### Acceptance Criteria
- [ ] Code splitting for routes
- [ ] Lazy loading for heavy components
- [ ] Production build optimization
- [ ] Service worker for caching
- [ ] Bundle size analysis

### Technical Approach
- React.lazy for route splitting
- Analyze bundle with webpack-bundle-analyzer
- Implement PWA features
- Optimize images and assets

@claude

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. PostgreSQL Database Schema
2. GitHub OAuth Authentication
3. Frontend Multi-User Support
4. API/WebSocket Security

### Phase 2: Core Features (Week 2)
1. Usage Tracking
2. Error Handling
3. Health/Metrics
4. Docker Setup

### Phase 3: Hardening (Week 3)
1. Security Headers
2. Database Backups
3. Performance Optimization
4. User Preferences

## Testing Strategy
- Integration tests for auth flow
- API endpoint testing with supertest
- Load testing for concurrent users
- Security scanning with OWASP tools

## Deployment Checklist
- [ ] Environment variables configured
- [ ] SSL certificate installed
- [ ] GitHub OAuth app configured
- [ ] Database migrations run
- [ ] Redis persistence enabled
- [ ] Monitoring dashboard set up
- [ ] Backup cron jobs scheduled
- [ ] Security headers verified