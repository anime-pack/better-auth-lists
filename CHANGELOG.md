# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-12-09

### Added
- **Server-Side Toggle Endpoint:** Added atomic `POST /api/auth/lists/:id/items/toggle` endpoint
  - Eliminates race conditions from client-side toggle implementation
  - Single atomic database operation (check + add/remove)
  - Returns `{ added: boolean, item?: ListItem }` for deterministic results
  - Handles concurrent requests gracefully with database locking
  - Fixes `ItemAlreadyExistsError` that occurred with client-side toggle logic

### Fixed
- **Toggle Race Condition:** Resolved critical bug where concurrent toggle operations caused `ItemAlreadyExistsError`
  - Previous implementation: Client checked existence, then sent add/remove request (race condition window)
  - New implementation: Server handles entire toggle operation atomically
  - Works perfectly with multiple tabs, users, or concurrent requests

### Changed
- Simplified `items.toggle()` client method to call new server endpoint
  - Reduced from 50+ lines of error handling to 5 lines
  - Single request instead of 2-3 requests
  - Cleaner, more maintainable code

## [0.2.1] - 2025-12-08

### Added
- **Invite Messages:** Added optional `message` field to list invitations
  - Inviters can now include a personal message when sharing lists
  - Message limited to 500 characters
  - Available in `ShareListInput` and stored in `ListInvite` entity
  - Example: `await shareList(listId, 'friend@example.com', 'view', 'Check out my anime collection!')`

## [0.2.0] - 2025-12-08

### Added
- **Feature Flag:** `createDefaultList` option to control automatic default list creation
  - Enabled by default (`true`) for backward compatibility
  - When enabled, creates default "Favorites" list on new user signup
  - **Lazy Creation:** Automatically creates default list for existing users on first query
  - Solves migration issue when adding plugin to Better-Auth instances with existing users
  - Can be disabled by setting `createDefaultList: false` in plugin options

### Changed
- Default list creation is now opt-in via feature flag instead of always-on
- Existing users without lists now get a default list automatically on first `getUserLists` query

## [0.1.2] - 2025-12-08

### Fixed
- **Response Structure:** Fixed confusing double-nested data responses in client plugin
  - Better-fetch automatically wraps responses in `{ data, error }` structure
  - Server endpoints were also wrapping in `{ data }`, causing `{ data: { data: actual } }` 
  - Updated all 26 client methods to properly unwrap the double-nested responses
  - Client now returns clean data structures without extra nesting
  - Example: `getUserLists()` now returns `{ data: [], meta: {} }` instead of `{ data: { data: [], meta: {} } }`
- **Error Handling:** Added proper error checking for all client methods
  - All methods now check `response.error` before accessing `response.data`
  - Throws error if present, preventing `null` access on `response.data`
  - Uses non-null assertion (`response.data!`) after error check for type safety

### Changed
- Updated `BetterAuthFetch` type to accurately reflect Better-Auth's response wrapping behavior
- Improved type inference for all client plugin methods

## [0.1.1] - 2025-12-08

### Fixed
- **CRITICAL:** Fixed authentication issue where all endpoints returned 401 Unauthorized despite valid session cookies
  - Added `sessionMiddleware` to all 23 endpoints across 4 files (lists.ts, items.ts, bulk.ts, sharing.ts)
  - `createAuthEndpoint` does NOT automatically populate session context - explicit middleware required
  - Import pattern changed: `import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api'`
  - All endpoints now include `use: [sessionMiddleware]` in configuration object
  - See AUTHENTICATION_FIX.md for detailed documentation

### Changed
- Updated all endpoint configurations to explicitly use session middleware
- Improved documentation in README.md with latest fix information

## [0.1.0] - 2025-12-07

### Added
- Initial release of Better-Auth Lists plugin
- Generic, type-safe lists/collections management for any entity type
- Support for custom entity types (numbers, strings, UUIDs)
- Default favorites list auto-created on user signup
- Full CRUD operations for lists and items
- Bulk operations (batch add/remove, move between lists, duplicate, import/export)
- Optional sharing & collaboration features with permissions (view/edit/admin)
- Advanced querying (filter, sort, search, pagination)
- Entity validation hooks for external API integration
- Comprehensive error handling with standardized error codes
- Client plugin for framework-agnostic frontend integration
- Full TypeScript support with type inference
- OpenAPI metadata for all endpoints

### Technical Details
- Better-Auth v1.4.5+ compatibility
- Fixed all adapter API changes (internalAdapter → adapter)
- Proper session null handling in all endpoints
- Schema definitions with proper TypeScript literal types
- Conditional endpoint registration based on feature flags
- 23 endpoints across 4 feature areas (lists, items, bulk, sharing)
- 4 database tables (lists, listItems, listShares, listInvites)

### Documentation
- Comprehensive README with multiple use cases (anime, movies, books, e-commerce)
- Full API reference documentation
- Contributing guidelines
- Implementation summary document
- JSDoc comments throughout codebase
