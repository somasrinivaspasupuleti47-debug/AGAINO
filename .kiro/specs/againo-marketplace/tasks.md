# Implementation Plan: AGAINO Marketplace Platform

## Overview

Incremental implementation of the AGAINO full-stack marketplace. Each task builds on the previous, starting with project scaffolding and infrastructure, then core auth, listings, search, chat, notifications, admin, and finally frontend integration and DevOps.

Language: **TypeScript** (backend) / **Next.js + TypeScript** (frontend)

---

## Tasks

- [-] 1. Project scaffolding and infrastructure setup
  - Initialize `backend/` as a Node.js/Express/TypeScript project with `tsconfig.json`, `eslint`, and `prettier`
  - Initialize `frontend/` as a Next.js 14 App Router project with TypeScript and Tailwind CSS
  - Create `backend/src/config/` modules for MongoDB connection (Mongoose), Redis client (ioredis), and environment variable validation (Zod)
  - Set up the Express app entry point with global middleware: `helmet`, `cors`, `express.json`, rate limiter stubs, and the `/api/v1` router mount
  - Create `.env.example` documenting all required environment variables
  - _Requirements: 23.4_

- [x] 2. Database models and indexes
  - [x] 2.1 Implement Mongoose schemas for User, OTP, and RefreshToken with all fields, indexes, and TTL indexes as specified in the data models
    - _Requirements: 1.6, 2.1, 2.3, 4.1_
  - [x] 2.2 Implement Mongoose schemas for Listing, Conversation, and Message with all fields, compound indexes, 2dsphere index, and text index
    - _Requirements: 5.2, 6.1, 8.4, 9.3, 9.7_
  - [x] 2.3 Implement Mongoose schemas for Notification, Report, and WishlistEntry with all fields, unique compound indexes, and TTL index on Notification
    - _Requirements: 12.1, 13.1, 14.4_
  - [x] 2.4 Write unit tests for schema validation and index definitions
    - Test required field enforcement, enum constraints, and unique index violations
    - _Requirements: 5.2, 12.3, 13.2_

- [x] 3. Auth Service — registration, OTP, and password hashing
  - [x] 3.1 Implement `POST /api/v1/auth/register` — validate body with Zod (email, displayName, password ≥ 8 chars), check for duplicate email (409), hash password with bcrypt cost 12, create User with `isVerified: false`, enqueue OTP email job
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 17.1_
  - [x] 3.2 Implement OTP generation (6-digit `crypto.randomInt`), hashed storage in OTP collection with 10-minute TTL, and `POST /api/v1/auth/verify-otp` — validate OTP, activate account, return JWT + RefreshToken
    - _Requirements: 1.3, 1.4, 1.5_
  - [x] 3.3 Write property test for OTP uniqueness and expiry
    - **Property 1: OTP codes are always 6 digits and expire after 10 minutes**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 3.4 Write unit tests for registration validation and duplicate email handling
    - _Requirements: 1.1, 1.2_

- [x] 4. Auth Service — login, JWT, refresh token rotation, and logout
  - [x] 4.1 Implement `POST /api/v1/auth/login` — validate credentials, return 401 on failure, issue 15-min JWT + 7-day RefreshToken on success; enforce auth rate limit (10 req/min)
    - _Requirements: 2.1, 2.2, 17.3_
  - [x] 4.2 Implement `POST /api/v1/auth/refresh` — validate RefreshToken, rotate (delete old, issue new), return 401 on revoked/expired token
    - _Requirements: 2.3, 2.4_
  - [x] 4.3 Implement `POST /api/v1/auth/logout` — delete all RefreshTokens for the authenticated user
    - _Requirements: 2.5_
  - [x] 4.4 Implement `requireAuth` middleware — verify JWT signature and expiry, attach `req.user`; implement `requireAdmin` middleware — check `role === 'admin'` and email match, return 403 otherwise
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [x] 4.5 Write property test for JWT token lifecycle
    - **Property 2: Access tokens expire in exactly 15 minutes; refresh tokens expire in exactly 7 days**
    - **Validates: Requirements 2.1, 2.3**
  - [x] 4.6 Write unit tests for refresh rotation and logout invalidation
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 5. Auth Service — password reset and Google OAuth
  - [x] 5.1 Implement `POST /api/v1/auth/forgot-password` — generate signed reset token (30-min expiry), enqueue reset email job
    - _Requirements: 3.1_
  - [x] 5.2 Implement `POST /api/v1/auth/reset-password` — validate token, enforce password strength (≥ 8 chars), update passwordHash, invalidate all RefreshTokens
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 5.3 Implement Google OAuth 2.0 flow (`GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback`) using Passport.js — create account if not exists, return JWT + RefreshToken
    - _Requirements: 2.6_
  - [x] 5.4 Write unit tests for password reset token expiry and strength validation
    - _Requirements: 3.3, 3.4_

- [ ] 6. Checkpoint — Auth complete
  - Ensure all auth tests pass, ask the user if questions arise.

- [x] 7. Security middleware
  - [x] 7.1 Implement global Zod validation middleware that returns 400 with field-level errors on schema failure
    - _Requirements: 17.1_
  - [x] 7.2 Implement rate limiting middleware using `express-rate-limit`: 100 req/min on public routes (429 on exceed), 10 req/min on auth routes
    - _Requirements: 17.2, 17.3_
  - [x] 7.3 Implement HTTP security headers middleware using `helmet` with CSP, X-Frame-Options, and X-Content-Type-Options
    - _Requirements: 17.4_
  - [x] 7.4 Implement XSS sanitization middleware (e.g., `xss-clean` or `sanitize-html`) applied to all user-supplied text fields before DB persistence
    - _Requirements: 17.6_
  - [x] 7.5 Implement CSRF token middleware for all state-changing requests from the web frontend
    - _Requirements: 17.7_
  - [x] 7.6 Write unit tests for rate limiter (429 response) and Zod validation error format
    - _Requirements: 17.1, 17.2_

- [x] 8. Image Service
  - [x] 8.1 Implement Multer middleware with memory storage, 5 MB per-file limit, and 10-file max; read magic bytes to verify MIME type (JPEG/PNG/WebP only), return 415 for invalid format and 413 for oversized files
    - _Requirements: 15.1, 15.2, 17.5_
  - [x] 8.2 Implement Sharp pipeline: resize to max 1200px width, generate 300px thumbnail, convert both to WebP; upload original + thumbnail + WebP to cloud storage (S3/GCS); return CDN URLs
    - _Requirements: 5.3, 5.4, 15.3, 15.4_
  - [x] 8.3 Write property test for image validation
    - **Property 3: Any file exceeding 5 MB or with a non-JPEG/PNG/WebP MIME type is always rejected before storage**
    - **Validates: Requirements 15.1, 15.2**
  - [x] 8.4 Write unit tests for Sharp resize output dimensions and WebP conversion
    - _Requirements: 5.4, 15.4_

- [x] 9. Listing Service — CRUD and status transitions
  - [x] 9.1 Implement `POST /api/v1/listings` — Zod-validate all required fields (title ≤ 100, description ≤ 2000, price ≥ 0, category, subcategory, condition, location), create Listing with status `draft`, return 201
    - _Requirements: 5.1, 5.2_
  - [x] 9.2 Implement `PATCH /api/v1/listings/:id` (owner only, 403 otherwise), `DELETE /api/v1/listings/:id` (soft-delete → `archived`), and `GET /api/v1/listings/my` (all statuses for owner)
    - _Requirements: 5.6, 5.7, 5.8_
  - [x] 9.3 Implement status transition guard enforcing the allowed state machine (Draft→Published, Published→Sold, Published→Archived, Draft→Archived, Archived→Published admin-only); return 400 for invalid transitions
    - _Requirements: 6.1_
  - [x] 9.4 Implement `PATCH /api/v1/listings/:id/publish` — transition Draft→Published, enqueue `admin.listing.published` BullMQ job, invalidate Redis feed/search/listing keys
    - _Requirements: 5.5, 10.1, 16.2_
  - [x] 9.5 Implement `PATCH /api/v1/listings/:id/sold` — transition Published→Sold, enqueue `admin.listing.sold` BullMQ job, invalidate Redis keys
    - _Requirements: 6.2, 6.3, 6.5, 10.6, 16.2_
  - [x] 9.6 Implement `GET /api/v1/listings` (public feed, Published only, paginated, featured first) and `GET /api/v1/listings/:id` (single listing detail)
    - _Requirements: 6.4, 16.4, 18.2_
  - [x] 9.7 Implement BullMQ repeatable job (hourly) that queries Published listings past `expiresAt` and sets them to `archived`; invalidate affected Redis keys
    - _Requirements: 5.9_
  - [x] 9.8 Write property test for listing status transitions
    - **Property 4: No listing can transition to a status not defined in the allowed state machine**
    - **Validates: Requirements 6.1**
  - [x] 9.9 Write unit tests for listing CRUD authorization (owner vs. non-owner) and field validation
    - _Requirements: 5.2, 5.7_

- [x] 10. Redis caching layer
  - [x] 10.1 Implement cache-aside helpers: `getOrSet(key, ttl, fetchFn)` using ioredis; apply to homepage feed (`feed:home:{page}`, 5 min TTL), category feed, and listing detail (`listing:{id}`, 5 min TTL)
    - _Requirements: 16.1_
  - [x] 10.2 Implement cache invalidation logic: on any listing write, use Redis `SCAN` to delete all matching `feed:*`, `search:*`, and `listing:{id}` keys
    - _Requirements: 16.2_
  - [x] 10.3 Write property test for cache invalidation
    - **Property 5: After any listing write, no stale feed or search cache entry for that listing remains in Redis**
    - **Validates: Requirements 16.2**

- [x] 11. Search Service
  - [x] 11.1 Implement `GET /api/v1/search` with MongoDB `$text` search on title+description, filter pipeline for price range, category, subcategory, condition, and `$geoWithin` radius filter; exclude Sold/Archived; sort by `newest`, `price_asc`, `price_desc`, `relevance`; paginate (default 20, max 100); prepend featured listings
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 18.3_
  - [x] 11.2 Implement `GET /api/v1/search/autocomplete?q=` — query `search_suggestions` collection, return up to 10 results, cache in Redis with 60-sec TTL; target < 300ms
    - _Requirements: 7.2_
  - [x] 11.3 Implement location-based search using MongoDB `$nearSphere` on the `2dsphere` index; accept `lat`, `lng`, `radius` query params
    - _Requirements: 8.2_
  - [x] 11.4 Write property test for search exclusion
    - **Property 6: Search results never contain listings with status Sold or Archived**
    - **Validates: Requirements 7.5**
  - [x] 11.5 Write unit tests for filter combinations and pagination boundary conditions
    - _Requirements: 7.3, 7.6_

- [ ] 12. Checkpoint — Backend core complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. BullMQ Email Queue and Notification Service
  - [ ] 13.1 Set up BullMQ queue (`emailQueue`) backed by Redis; implement worker that sends emails via Nodemailer/SMTP; configure retry policy: 3 attempts, exponential backoff (2s, 4s, 8s); route failed jobs to dead-letter queue
    - _Requirements: 10.3, 10.4, 10.5_
  - [ ] 13.2 Implement job handlers for all four admin email job types: `admin.listing.published`, `admin.listing.sold`, `admin.report.created`, `admin.user.registered`; each email must include the fields specified in requirement 10.2
    - _Requirements: 10.1, 10.2, 10.6, 10.7, 10.8_
  - [ ] 13.3 Implement Notification model persistence: save in-app notifications to MongoDB on relevant events; implement `GET /api/v1/notifications` to return unread notifications for the authenticated user
    - _Requirements: 14.4_
  - [ ] 13.4 Write unit tests for BullMQ job enqueue timing (within 5 seconds of trigger) and retry behavior
    - _Requirements: 10.1, 10.4_

- [ ] 14. Socket.io Server — Chat and real-time notifications
  - [ ] 14.1 Set up Socket.io server attached to the Express HTTP server; implement `requireAuth` handshake middleware (validate JWT on connection); join user to personal room `user:{userId}` on connect
    - _Requirements: 9.1, 14.1_
  - [ ] 14.2 Implement chat socket events: `join_conversation`, `send_message` (persist to MongoDB, emit `new_message` to room), `typing_start`/`typing_stop` (broadcast `typing` event), `mark_read` (update `isRead`, emit `message_read`)
    - _Requirements: 9.2, 9.4, 9.5, 9.7_
  - [ ] 14.3 Implement image sharing in chat: accept `type: 'image'` messages, run through Image Service validation and upload, store CDN URL in Message document
    - _Requirements: 9.6_
  - [ ] 14.4 Implement in-app notification emission: on `new_message`, emit `notification` event to recipient's `user:{userId}` room; on listing status change, emit `listing_status_changed` to owner's room
    - _Requirements: 14.2, 14.3_
  - [ ] 14.5 Implement REST endpoints for chat history: `POST /api/v1/conversations`, `GET /api/v1/conversations`, `GET /api/v1/conversations/:id/messages` (paginated)
    - _Requirements: 9.3, 9.7_
  - [ ] 14.6 Write unit tests for socket event handlers (message persistence, read receipt update)
    - _Requirements: 9.2, 9.5_

- [ ] 15. Report and Wishlist Services
  - [ ] 15.1 Implement `POST /api/v1/reports` — Zod-validate reason category + optional description, enforce one-report-per-user-per-listing (409 on duplicate), create Report record, enqueue `admin.report.created` email job
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  - [ ] 15.2 Implement Wishlist endpoints: `POST /api/v1/wishlist/:listingId` (add, 409 on duplicate), `DELETE /api/v1/wishlist/:listingId` (remove), `GET /api/v1/wishlist` (return Published listings only)
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  - [ ] 15.3 Write property test for wishlist and report uniqueness
    - **Property 7: A user can never have more than one wishlist entry or report per listing**
    - **Validates: Requirements 12.3, 13.2**
  - [ ] 15.4 Write unit tests for wishlist filtering (only Published listings returned)
    - _Requirements: 13.3_

- [ ] 16. Admin Service
  - [ ] 16.1 Implement `GET /api/v1/admin/stats` — aggregate counts for total users, active listings, sold listings, reported listings; protect with `requireAdmin`
    - _Requirements: 11.1, 11.2_
  - [ ] 16.2 Implement user management endpoints: `GET /api/v1/admin/users` (paginated), `PATCH /api/v1/admin/users/:id/block` (set `isBlocked: true`, invalidate all RefreshTokens), `PATCH /api/v1/admin/users/:id/unblock`
    - _Requirements: 11.3, 11.4_
  - [ ] 16.3 Implement admin listing endpoints: `GET /api/v1/admin/listings` (all statuses, paginated), `PATCH /api/v1/admin/listings/:id/approve`, `PATCH /api/v1/admin/listings/:id/reject`, `DELETE /api/v1/admin/listings/:id` (hard delete + remove images from storage), `PATCH /api/v1/admin/listings/:id/restore` (Archived→Published), `PATCH /api/v1/admin/listings/:id/sold`, `PATCH /api/v1/admin/listings/:id/featured`
    - _Requirements: 11.5, 11.6, 11.8, 11.9, 11.10, 18.1, 18.4_
  - [ ] 16.4 Implement report management endpoints: `GET /api/v1/admin/reports` (paginated, with listing and reporter details), `PATCH /api/v1/admin/reports/:id` (update status: reviewed/dismissed)
    - _Requirements: 11.7, 12.5_
  - [ ] 16.5 Write unit tests for `requireAdmin` middleware (403 for non-admin, 403 for blocked admin)
    - _Requirements: 11.1, 4.3_

- [ ] 17. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. API documentation and versioning
  - [ ] 18.1 Integrate `swagger-jsdoc` and `swagger-ui-express`; expose `/api/docs` with OpenAPI 3.0 spec documenting all endpoints, request/response schemas, auth requirements, and error codes
    - _Requirements: 22.1, 22.2_
  - [ ] 18.2 Verify all routes are mounted under `/api/v1/` prefix
    - _Requirements: 22.3_

- [ ] 19. Next.js Frontend — core layout and auth pages
  - [ ] 19.1 Implement shared layout with navigation, auth state context (JWT stored in httpOnly cookie via API route), and i18n setup using Next.js built-in i18n routing with `en` as default locale and locale persistence in cookie
    - _Requirements: 19.1, 19.2, 19.3_
  - [ ] 19.2 Implement Register page (form with email, displayName, password), OTP verification page, Login page, Forgot Password page, and Reset Password page; wire to auth API endpoints
    - _Requirements: 1.1, 2.1, 3.1, 3.2_
  - [ ] 19.3 Implement Google OAuth sign-in button on Login/Register pages
    - _Requirements: 2.6_

- [ ] 20. Next.js Frontend — listing pages and SSR
  - [ ] 20.1 Implement Listing Detail page using Next.js SSR (`generateMetadata` + `fetch` in Server Component) with unique `<title>`, `<meta description>`, Open Graph, and Twitter Card tags
    - _Requirements: 16.3, 21.1, 21.2_
  - [ ] 20.2 Implement homepage feed with infinite scroll (load next page when within 200px of bottom), lazy-loaded listing images, and featured listings displayed first
    - _Requirements: 16.5, 15.5, 18.2_
  - [ ] 20.3 Implement Create/Edit Listing form with image upload (1–10 files, drag-and-drop), all required fields, and Google Maps location picker
    - _Requirements: 5.2, 5.3, 8.3_
  - [ ] 20.4 Implement Search page with filter sidebar (price range, category, condition, radius), sort controls, and paginated results with featured listings at top
    - _Requirements: 7.3, 7.4, 18.3_
  - [ ] 20.5 Implement My Listings page (all statuses), Wishlist page, and user profile page
    - _Requirements: 6.4, 13.3_

- [ ] 21. Next.js Frontend — real-time chat UI
  - [ ] 21.1 Implement Socket.io client connection (authenticated via JWT), conversation list page, and chat thread page with message history (paginated), send message input, and image sharing
    - _Requirements: 9.1, 9.6, 9.7_
  - [ ] 21.2 Implement typing indicators and read receipts in the chat UI
    - _Requirements: 9.4, 9.5_
  - [ ] 21.3 Implement in-app notification bell with unread count badge; on `notification` socket event, update badge and show toast; fetch missed notifications on reconnect
    - _Requirements: 14.1, 14.2, 14.4_

- [ ] 22. Next.js Frontend — Admin Dashboard
  - [ ] 22.1 Implement Admin Dashboard layout (accessible only to admin role) with stats overview cards (total users, active listings, sold listings, reported listings)
    - _Requirements: 11.1, 11.2_
  - [ ] 22.2 Implement Users management table with block/unblock actions
    - _Requirements: 11.3, 11.4_
  - [ ] 22.3 Implement Listings management table (all statuses) with approve, reject, restore, mark sold, toggle featured, and hard delete actions
    - _Requirements: 11.5, 11.6, 11.8, 11.9, 11.10, 18.4_
  - [ ] 22.4 Implement Reports management table with dismiss/act actions
    - _Requirements: 11.7, 12.5_

- [ ] 23. SEO, PWA, and sitemap
  - [ ] 23.1 Implement `GET /api/v1/sitemap.xml` (or Next.js `sitemap.ts`) generating all Published Listing URLs dynamically; add `robots.txt` permitting public listing pages and disallowing `/admin` and `/account` paths
    - _Requirements: 21.3, 21.4_
  - [ ] 23.2 Add `manifest.json` with AGAINO branding, icons, and theme colors; register Service Worker (`sw.js`) caching static assets and previously visited listing pages; implement install prompt on supported mobile browsers
    - _Requirements: 20.1, 20.2, 20.3_

- [ ] 24. DevOps and CI/CD
  - [ ] 24.1 Write `Dockerfile` for the backend (multi-stage: build → production) and `Dockerfile` for the frontend (Next.js standalone output)
    - _Requirements: 23.1_
  - [ ] 24.2 Write `docker-compose.yml` orchestrating frontend, backend, MongoDB, and Redis services with health checks and volume mounts for local development
    - _Requirements: 23.2_
  - [ ] 24.3 Write `.github/workflows/ci.yml` GitHub Actions workflow: lint, type-check, and test on every pull request for both frontend and backend
    - _Requirements: 23.3_
  - [ ] 24.4 Write database seed scripts (`backend/src/seeds/`) populating sample categories, users, and listings for development and demo
    - _Requirements: 23.5_

- [ ] 25. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness invariants; unit tests validate specific examples and edge cases
