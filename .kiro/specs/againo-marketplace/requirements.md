# Requirements Document

## Introduction

AGAINO is a production-ready, full-stack buy & sell marketplace web application — a modern online classifieds platform similar to OLX. The platform enables users to list, discover, and purchase second-hand or new products locally, with a focus on speed, simplicity, trust, and scalability. The name reflects the brand vision: "Buy Again, Sell Again" — promoting reuse and simple local commerce.

The system is composed of a Next.js frontend, a Node.js/Express REST API backend, MongoDB database, Redis caching layer, Socket.io real-time engine, and a BullMQ-based background job system for async email notifications.

---

## Glossary

- **System**: The AGAINO platform as a whole
- **API**: The AGAINO REST API backend service
- **Auth_Service**: The authentication and authorization subsystem
- **User**: A registered, authenticated individual who can buy or sell on the platform
- **Admin**: A privileged user with elevated access; restricted to the email somasrinivaspasupuleti47@gmail.com
- **Listing**: A product advertisement created by a User, containing title, description, price, category, condition, location, and images
- **Listing_Status**: One of four states a Listing can be in: Draft, Published, Sold, Archived
- **Chat_Service**: The real-time WebSocket-based messaging subsystem
- **Notification_Service**: The subsystem responsible for delivering in-app and email notifications
- **Email_Queue**: The BullMQ-based background job queue responsible for async email delivery
- **Search_Service**: The full-text search and filtering subsystem
- **Location_Service**: The subsystem responsible for geolocation detection and radius-based search
- **Image_Service**: The subsystem responsible for secure file upload, storage, and optimization
- **Admin_Dashboard**: The restricted admin control panel accessible only to the Admin
- **Report**: A user-submitted flag on a Listing indicating suspected spam, fraud, or policy violation
- **Wishlist**: A User's saved collection of Listings they are interested in
- **OTP**: One-time password sent via email for identity verification
- **JWT**: JSON Web Token used for stateless authentication
- **Refresh_Token**: A long-lived token used to obtain new access JWTs without re-authentication
- **CDN**: Content Delivery Network used for serving optimized static assets and images

---

## Requirements

### Requirement 1: User Registration and Email Verification

**User Story:** As a visitor, I want to register an account with email verification, so that I can access the marketplace as a trusted user.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept registration requests containing a unique email address, a display name, and a password of at least 8 characters.
2. WHEN a registration request is received with a duplicate email, THE Auth_Service SHALL return a 409 Conflict error with a descriptive message.
3. WHEN a valid registration request is received, THE Auth_Service SHALL send a 6-digit OTP to the provided email address within 60 seconds.
4. WHEN a User submits a valid OTP within 10 minutes of issuance, THE Auth_Service SHALL activate the account and return a JWT access token and a Refresh_Token.
5. IF a User submits an expired or invalid OTP, THEN THE Auth_Service SHALL return a 400 error and allow the User to request a new OTP.
6. THE Auth_Service SHALL hash all passwords using bcrypt with a minimum cost factor of 12 before storing them.

---

### Requirement 2: User Authentication with JWT

**User Story:** As a registered user, I want to log in securely and stay authenticated, so that I can use the platform without repeatedly entering my credentials.

#### Acceptance Criteria

1. WHEN a User submits valid credentials, THE Auth_Service SHALL return a signed JWT access token with a 15-minute expiry and a Refresh_Token with a 7-day expiry.
2. WHEN a User submits invalid credentials, THE Auth_Service SHALL return a 401 Unauthorized error.
3. WHEN a valid Refresh_Token is submitted to the token refresh endpoint, THE Auth_Service SHALL issue a new JWT access token and rotate the Refresh_Token.
4. IF a Refresh_Token has been revoked or expired, THEN THE Auth_Service SHALL return a 401 error and require the User to log in again.
5. THE Auth_Service SHALL invalidate all Refresh_Tokens for a User upon explicit logout.
6. WHERE Google OAuth is enabled, THE Auth_Service SHALL allow Users to authenticate via Google OAuth 2.0 and create an account if one does not exist.

---

### Requirement 3: Password Reset Flow

**User Story:** As a user who forgot my password, I want to reset it via email, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a User requests a password reset with a registered email, THE Auth_Service SHALL send a password reset link containing a signed token valid for 30 minutes.
2. WHEN a User submits a new password with a valid reset token, THE Auth_Service SHALL update the password and invalidate all existing Refresh_Tokens for that User.
3. IF a password reset token is expired or invalid, THEN THE Auth_Service SHALL return a 400 error with a descriptive message.
4. THE Auth_Service SHALL enforce the same password strength rules (minimum 8 characters) during password reset as during registration.

---

### Requirement 4: Role-Based Access Control

**User Story:** As a platform operator, I want role-based access control, so that Admin capabilities are protected from regular users.

#### Acceptance Criteria

1. THE Auth_Service SHALL assign every registered User the role of "user" by default.
2. THE Auth_Service SHALL restrict the "admin" role exclusively to accounts with the email address somasrinivaspasupuleti47@gmail.com.
3. WHEN a request to an admin-protected route is made without a valid admin JWT, THE API SHALL return a 403 Forbidden error.
4. THE API SHALL validate the JWT and role on every protected request without relying on session state.

---

### Requirement 5: Listing Creation and Management

**User Story:** As a seller, I want to create, edit, and manage my product listings, so that I can advertise items for sale.

#### Acceptance Criteria

1. WHEN a User submits a valid listing creation request, THE API SHALL create a Listing with status "Draft" and return the created Listing object.
2. THE API SHALL require the following fields for a Listing: title (max 100 characters), description (max 2000 characters), price (non-negative number), category, subcategory, condition (one of: new, used), and location.
3. THE Image_Service SHALL accept between 1 and 10 image files per Listing, each no larger than 5 MB, in JPEG, PNG, or WebP format.
4. WHEN images are uploaded, THE Image_Service SHALL optimize and resize images to a maximum width of 1200px and generate thumbnails at 300px width.
5. WHEN a User publishes a Draft Listing, THE API SHALL change the Listing_Status to "Published" and trigger the admin notification job via the Email_Queue.
6. WHEN a User edits a Listing they own, THE API SHALL update only the fields provided and return the updated Listing object.
7. IF a User attempts to edit or delete a Listing they do not own, THEN THE API SHALL return a 403 Forbidden error.
8. WHEN a User deletes a Listing, THE API SHALL set the Listing_Status to "Archived" rather than permanently removing the record.
9. THE API SHALL support a listing expiration duration; WHEN a Published Listing reaches its expiration date, THE API SHALL automatically set its status to "Archived".

---

### Requirement 6: Product Lifecycle and Status Management

**User Story:** As a seller, I want my listing status to accurately reflect its lifecycle, so that buyers see only available items.

#### Acceptance Criteria

1. THE API SHALL enforce that a Listing's status transitions follow this sequence: Draft → Published → Sold or Archived.
2. WHEN a Listing's status is set to "Sold", THE API SHALL immediately exclude it from homepage feeds and all search results.
3. WHEN a Listing's status is set to "Sold", THE System SHALL retain the Listing record in the database with all original data intact.
4. WHILE a Listing has status "Sold" or "Archived", THE API SHALL return it only in responses to Admin Dashboard queries or the owning User's personal listing history.
5. WHEN a Listing is marked as "Sold", THE Notification_Service SHALL trigger an email notification to the Admin via the Email_Queue.

---

### Requirement 7: Search and Filtering

**User Story:** As a buyer, I want to search and filter listings, so that I can quickly find relevant products.

#### Acceptance Criteria

1. THE Search_Service SHALL support full-text search across Listing title and description fields.
2. WHEN a search query of at least 2 characters is submitted, THE Search_Service SHALL return autocomplete suggestions within 300ms under normal load.
3. THE Search_Service SHALL support filtering by: price range (min/max), category, subcategory, condition (new/used), and location radius in kilometers.
4. THE Search_Service SHALL support sorting results by: newest first, price ascending, price descending, and relevance score.
5. THE Search_Service SHALL exclude Listings with status "Sold" or "Archived" from all search results and homepage feeds.
6. THE API SHALL return paginated search results with a default page size of 20 and a maximum page size of 100.

---

### Requirement 8: Location Services

**User Story:** As a buyer, I want to search for listings near my location, so that I can find items available locally.

#### Acceptance Criteria

1. WHEN a User grants location permission, THE Location_Service SHALL detect the User's coordinates using the browser Geolocation API.
2. THE Location_Service SHALL support radius-based search filtering using geospatial queries on stored Listing coordinates.
3. THE System SHALL integrate Google Maps to display Listing locations on a map view.
4. WHEN a User creates a Listing, THE API SHALL accept a location object containing city, region, and optional latitude/longitude coordinates.

---

### Requirement 9: Real-Time Chat

**User Story:** As a buyer, I want to message sellers directly about a listing, so that I can negotiate and arrange a transaction.

#### Acceptance Criteria

1. THE Chat_Service SHALL establish WebSocket connections using Socket.io for all authenticated Users.
2. WHEN a User sends a message, THE Chat_Service SHALL deliver it to the recipient in real time with a latency under 500ms under normal load.
3. THE Chat_Service SHALL associate each conversation thread with a specific Listing.
4. THE Chat_Service SHALL support typing indicators: WHEN a User is composing a message, THE Chat_Service SHALL broadcast a typing event to the other participant.
5. THE Chat_Service SHALL support read receipts: WHEN a message is viewed by the recipient, THE Chat_Service SHALL mark it as read and notify the sender.
6. THE Chat_Service SHALL allow Users to share images within a conversation, subject to the same file size and format constraints as Listing images.
7. THE API SHALL persist all chat messages in the database to support message history retrieval.

---

### Requirement 10: Admin Email Notification System

**User Story:** As an admin, I want to receive instant email alerts when key events occur, so that I can monitor platform activity in real time.

#### Acceptance Criteria

1. WHEN a Listing is published, THE Email_Queue SHALL enqueue an email notification job targeting somasrinivaspasupuleti47@gmail.com within 5 seconds of the publish event.
2. THE Notification_Service SHALL send the admin notification email containing: product title, price, category, seller name, seller email, location, timestamp, and a direct link to the Admin Dashboard listing view.
3. THE Email_Queue SHALL use BullMQ with Redis as the backing store for job persistence.
4. IF an email delivery attempt fails, THEN THE Email_Queue SHALL retry the job up to 3 times with exponential backoff before marking it as failed.
5. THE Notification_Service SHALL process email jobs asynchronously so that the publish API response is not blocked by email delivery.
6. WHEN a Listing is marked as "Sold", THE Email_Queue SHALL enqueue an admin notification email with the listing details and sold timestamp.
7. WHEN a Report is submitted against a Listing, THE Email_Queue SHALL enqueue an admin notification email with the report details and reporter information.
8. WHERE new user signup notifications are enabled, THE Email_Queue SHALL enqueue a notification email to the Admin upon each new user registration.

---

### Requirement 11: Admin Dashboard and Control System

**User Story:** As an admin, I want a dedicated dashboard to manage users, listings, and reports, so that I can maintain platform quality and safety.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL be accessible only to authenticated Users with the "admin" role.
2. THE Admin_Dashboard SHALL display aggregate statistics including: total registered users, total active listings, total sold listings, and total reported listings.
3. THE Admin_Dashboard SHALL provide a paginated view of all Users with the ability to block or unblock individual accounts.
4. WHEN an Admin blocks a User, THE API SHALL prevent that User from logging in and return a 403 error on all authenticated requests.
5. THE Admin_Dashboard SHALL display ALL Listings regardless of status (Draft, Published, Sold, Archived).
6. THE Admin_Dashboard SHALL allow the Admin to approve, reject, edit, or permanently delete any Listing.
7. THE Admin_Dashboard SHALL display all submitted Reports with the associated Listing and reporter details.
8. WHEN an Admin permanently deletes a Listing, THE API SHALL remove the Listing record and all associated images from storage.
9. THE Admin_Dashboard SHALL allow the Admin to restore an Archived Listing to Published status.
10. THE Admin_Dashboard SHALL allow the Admin to mark any Published Listing as Sold.

---

### Requirement 12: Report and Moderation System

**User Story:** As a user, I want to report suspicious or inappropriate listings, so that the platform remains safe and trustworthy.

#### Acceptance Criteria

1. WHEN an authenticated User submits a Report on a Listing, THE API SHALL create a Report record linked to the Listing and the reporting User.
2. THE API SHALL require a reason category and optional description when creating a Report.
3. THE API SHALL prevent a User from submitting more than one Report per Listing.
4. WHEN a Report is created, THE Notification_Service SHALL enqueue an admin alert email via the Email_Queue.
5. THE Admin_Dashboard SHALL allow the Admin to dismiss or act on Reports, updating the Report status accordingly.

---

### Requirement 13: Wishlist / Favorites

**User Story:** As a buyer, I want to save listings to a wishlist, so that I can revisit items I'm interested in later.

#### Acceptance Criteria

1. WHEN an authenticated User adds a Listing to their Wishlist, THE API SHALL create a Wishlist entry linking the User and the Listing.
2. THE API SHALL prevent duplicate Wishlist entries for the same User and Listing combination.
3. WHEN a User requests their Wishlist, THE API SHALL return all saved Listings that are still in Published status.
4. WHEN a User removes a Listing from their Wishlist, THE API SHALL delete the corresponding Wishlist entry.

---

### Requirement 14: Real-Time Notifications

**User Story:** As a user, I want to receive real-time in-app notifications, so that I stay informed about activity related to my listings and messages.

#### Acceptance Criteria

1. THE Notification_Service SHALL deliver in-app notifications via WebSocket to connected Users in real time.
2. WHEN a User receives a new chat message, THE Notification_Service SHALL emit a notification event to that User's active WebSocket connection.
3. WHEN a User's Listing status changes, THE Notification_Service SHALL emit a notification event to the Listing owner.
4. THE API SHALL persist unread notifications and return them on request so Users who were offline receive missed notifications upon reconnection.

---

### Requirement 15: Image Upload and Optimization

**User Story:** As a seller, I want to upload multiple product images that load fast, so that my listings look professional without slowing down the page.

#### Acceptance Criteria

1. THE Image_Service SHALL validate that uploaded files are JPEG, PNG, or WebP format and reject all other formats with a 415 error.
2. THE Image_Service SHALL reject any single file exceeding 5 MB with a 413 error.
3. WHEN images are stored, THE Image_Service SHALL serve them via CDN with appropriate cache headers.
4. THE Image_Service SHALL generate WebP-format optimized versions of all uploaded images.
5. THE System SHALL use lazy loading for all Listing images in the frontend to minimize initial page load time.

---

### Requirement 16: Performance and Caching

**User Story:** As a user, I want the platform to load quickly and respond fast, so that I have a smooth browsing experience.

#### Acceptance Criteria

1. THE API SHALL cache frequently accessed data (homepage feed, category listings, search results) in Redis with a TTL of 5 minutes.
2. WHEN a Listing is created, updated, or deleted, THE API SHALL invalidate the relevant Redis cache entries.
3. THE System SHALL use Next.js Server-Side Rendering for Listing detail pages to support SEO indexing.
4. THE API SHALL return paginated results for all list endpoints to prevent unbounded query sizes.
5. THE System SHALL implement infinite scroll on the frontend, loading the next page of results when the User scrolls within 200px of the bottom of the listing feed.

---

### Requirement 17: Security Controls

**User Story:** As a platform operator, I want robust security controls, so that the platform is protected against common web vulnerabilities.

#### Acceptance Criteria

1. THE API SHALL validate all incoming request bodies using Zod schemas and return a 400 error with field-level details for any validation failure.
2. THE API SHALL enforce rate limiting of 100 requests per minute per IP address on all public endpoints, returning a 429 error when exceeded.
3. THE API SHALL enforce rate limiting of 10 requests per minute per IP address on authentication endpoints.
4. THE API SHALL set appropriate HTTP security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options) on all responses.
5. THE Image_Service SHALL scan uploaded file content to verify MIME type matches the declared file extension before storing.
6. THE API SHALL sanitize all user-supplied text fields to prevent XSS injection before persisting to the database.
7. THE API SHALL use CSRF tokens for all state-changing requests from the web frontend.

---

### Requirement 18: Featured Listings (Ads System)

**User Story:** As a seller, I want to promote my listing as featured, so that it appears at the top of search results and the homepage.

#### Acceptance Criteria

1. THE API SHALL support a "featured" flag on Listings that can be set by the Admin or through a promotion flow.
2. WHEN the homepage feed is requested, THE API SHALL return featured Listings before non-featured Listings within the same result set.
3. WHEN a search is performed, THE API SHALL return featured Listings at the top of results before applying relevance sorting to non-featured items.
4. THE Admin_Dashboard SHALL allow the Admin to toggle the featured status of any Published Listing.

---

### Requirement 19: Multi-Language Support

**User Story:** As a user in a non-English locale, I want the interface in my language, so that I can use the platform comfortably.

#### Acceptance Criteria

1. THE System SHALL support internationalization (i18n) using Next.js built-in i18n routing.
2. THE System SHALL provide English as the default language with the ability to add additional locale files.
3. WHEN a User selects a language, THE System SHALL persist the preference and apply it on subsequent visits.

---

### Requirement 20: Progressive Web App (PWA)

**User Story:** As a mobile user, I want to install AGAINO on my home screen and use it offline, so that I have a native-like experience.

#### Acceptance Criteria

1. THE System SHALL include a valid Web App Manifest with AGAINO branding, icons, and theme colors.
2. THE System SHALL register a Service Worker that caches static assets and previously visited Listing pages for offline access.
3. WHEN the System is accessed on a supported mobile browser, THE System SHALL display an install prompt for adding to the home screen.

---

### Requirement 21: SEO Optimization

**User Story:** As a platform operator, I want listings to be indexed by search engines, so that organic traffic drives user growth.

#### Acceptance Criteria

1. THE System SHALL generate unique, descriptive `<title>` and `<meta description>` tags for each Listing detail page using SSR.
2. THE System SHALL generate Open Graph and Twitter Card meta tags for each Listing detail page to support social sharing previews.
3. THE System SHALL generate and serve a dynamic `sitemap.xml` containing all Published Listing URLs.
4. THE System SHALL serve a `robots.txt` file that permits indexing of public Listing pages and disallows indexing of admin and user account pages.

---

### Requirement 22: API Documentation

**User Story:** As a developer integrating with AGAINO, I want comprehensive API documentation, so that I can understand and use the API correctly.

#### Acceptance Criteria

1. THE API SHALL expose a Swagger/OpenAPI 3.0 documentation endpoint at `/api/docs`.
2. THE API SHALL document all endpoints including request schemas, response schemas, authentication requirements, and error codes.
3. THE API SHALL version all endpoints under a `/api/v1/` prefix to support future non-breaking evolution.

---

### Requirement 23: DevOps and Deployment

**User Story:** As a DevOps engineer, I want containerized, CI/CD-ready deployment configuration, so that the application can be reliably deployed and scaled.

#### Acceptance Criteria

1. THE System SHALL include a `Dockerfile` for both the frontend and backend services.
2. THE System SHALL include a `docker-compose.yml` that orchestrates the frontend, backend, MongoDB, and Redis services for local development.
3. THE System SHALL include a GitHub Actions CI/CD workflow that runs linting, tests, and builds on every pull request.
4. THE System SHALL manage all secrets and environment-specific configuration through environment variables with a documented `.env.example` file.
5. THE System SHALL include database seed scripts to populate sample categories, users, and listings for development and demo purposes.
