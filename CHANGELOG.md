# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
