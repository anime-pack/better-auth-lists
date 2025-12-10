# @anime-pack/better-auth-lists

> **✅ Production Ready**
> 
> This plugin is fully compatible with Better-Auth v1.4.5+ and ready for production use.
> All adapter methods, session handling, and type safety have been verified and optimized.
> 
> **Status:** Feature-complete with Better-Auth v1.4.5+ compatibility.
> 
> ⚠️ **Minimum Version:** Requires Better-Auth v1.4.5 or higher due to breaking API changes in the adapter interface.
> 
> **Latest Update (Dec 9, 2025):** Fixed authentication by adding `sessionMiddleware` to all endpoints. The `createAuthEndpoint` function requires explicit middleware to populate session context.

A fully generic, type-safe lists/collections plugin for [Better-Auth](https://better-auth.com) that works with any entity type (anime, movies, books, products, etc.).

## Features

✅ **Fully Generic** - Works with any entity type (numbers, strings, UUIDs)  
✅ **Type-Safe** - Full TypeScript support with type inference  
✅ **Flexible Lists** - Default favorites + custom user lists  
✅ **Bulk Operations** - Batch add/remove/move items efficiently  
✅ **List Sharing** - Collaborate with permission levels (view/edit/admin)  
✅ **Import/Export** - JSON-based list portability  
✅ **Entity Validation** - Optional validation hooks for external APIs  
✅ **Advanced Querying** - Filter, sort, search, and paginate  
✅ **Client Helpers** - Framework-agnostic client plugin  
✅ **Well Tested** - Comprehensive unit test suite with Vitest

## Installation

```bash
npm install @anime-pack/better-auth-lists
# or
pnpm add @anime-pack/better-auth-lists
# or
bun add @anime-pack/better-auth-lists
```

**Peer Dependencies:**
- `better-auth >= 1.4.5` (requires v1.4.5+ for adapter API compatibility)
- `zod ^3.23.0`

## Quick Start

### Server Setup

```typescript
import { betterAuth } from 'better-auth';
import { listsPlugin } from '@anime-pack/better-auth-lists';

export const auth = betterAuth({
  database: /* your database adapter */,
  
  plugins: [
    // For anime IDs (numbers)
    listsPlugin<number>({
      maxCustomLists: 10,
      maxItemsPerList: 100,
      defaultListName: 'Favorites',
      
      // Optional: Validate entities against external API
      validateEntity: async (animeId) => {
        const response = await fetch(`https://api.myanimelist.net/v2/anime/${animeId}`);
        return response.ok;
      },
      
      // Optional: Enable sharing features
      sharing: {
        enabled: true,
        maxShares: 50,
        inviteExpirationHours: 168, // 7 days
      },
    }),
  ],
});
```

### Client Setup

```typescript
import { createAuthClient } from 'better-auth/client';
import { listsClient } from '@anime-pack/better-auth-lists/client';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  
  plugins: [
    listsClient<number>(), // Match server entity type
  ],
});
```

## Usage Examples

### Basic List Operations

```typescript
// Get all user lists
const { data: lists } = await authClient.lists.getUserLists({
  sortBy: 'createdAt',
  order: 'desc',
  limit: 20,
});

// Create a new list
const newList = await authClient.lists.create({
  name: 'Plan to Watch',
  description: 'Animes I want to watch someday',
  isPublic: false,
  maxItems: 100,
});

// Get specific list with items
const list = await authClient.lists.getList(listId);

// Update list
await authClient.lists.update(listId, {
  name: 'Updated Name',
  isPublic: true,
});

// Delete list (except default favorites)
await authClient.lists.delete(listId);
```

### Managing Items

```typescript
// Add item to list
const item = await authClient.items.add(listId, {
  entityId: 1535, // Anime ID
  notes: 'Recommended by friend',
  position: 0, // Optional position
});

// Remove item from list
await authClient.items.remove(listId, itemId);

// Update item
await authClient.items.update(listId, itemId, {
  notes: 'Updated notes',
  position: 5,
});

// Toggle item (add if not present, remove if present)
// Race-condition free with atomic server-side operation
const { added, item } = await authClient.items.toggle(listId, animeId);
if (added) {
  console.log('Item added:', item);
} else {
  console.log('Item removed');
}
```

### Checking Items Across Lists

```typescript
// Check if anime is in any user list
const result = await authClient.lists.isInAnyList(1535);
// Returns: { entityId: 1535, inLists: [{ listId, listName }], count: 2 }

if (result.count > 0) {
  console.log(`Found in ${result.count} lists:`, result.inLists);
}
```

### Bulk Operations

```typescript
// Batch add multiple items
const result = await authClient.bulk.addItems(listId, {
  items: [
    { entityId: 1535, notes: 'Death Note' },
    { entityId: 5114, notes: 'Fullmetal Alchemist' },
    { entityId: 16498, notes: 'Attack on Titan' },
  ],
});

console.log(`Added ${result.successCount}, failed ${result.failedCount}`);
result.failed.forEach(f => console.error(f.error));

// Batch remove items
await authClient.bulk.removeItems(listId, {
  entityIds: [1535, 5114], // Remove by entity IDs
  // OR itemIds: ['item-uuid-1', 'item-uuid-2'], // Remove by item IDs
});

// Move items between lists
await authClient.bulk.moveItems({
  sourceListId: list1.id,
  targetListId: list2.id,
  itemIds: ['item-id-1', 'item-id-2'],
});

// Duplicate a list
const copy = await authClient.bulk.duplicate(listId, {
  newName: 'My List (Copy)',
  includeItems: true,
});
```

### Import/Export Lists

```typescript
// Export list to JSON
const exportData = await authClient.bulk.export(listId);
// Save to file, send to another service, etc.

// Import list from JSON
const { list, importResult } = await authClient.bulk.import(exportData);
console.log(`Imported list "${list.name}" with ${importResult.successCount} items`);
```

### List Sharing (Optional Feature)

```typescript
// Invite user to list
await authClient.sharing.invite(listId, {
  email: 'friend@example.com',
  permission: 'edit', // 'view' | 'edit' | 'admin'
});

// Get list invites
const invites = await authClient.sharing.getInvites(listId);

// Accept invite (by invitee)
await authClient.sharing.acceptInvite(inviteToken);

// Reject invite
await authClient.sharing.rejectInvite(inviteToken);

// Get list members
const { owner, members } = await authClient.sharing.getMembers(listId);

// Update member permission (owner only)
await authClient.sharing.updatePermission(listId, userId, 'admin');

// Revoke access (owner only)
await authClient.sharing.revoke(listId, userId);
```

## Configuration Options

```typescript
interface ListsPluginOptions<TEntity = string | number> {
  /**
   * Maximum custom lists per user (excluding default favorites)
   * @default 10
   */
  maxCustomLists?: number;

  /**
   * Maximum items allowed per list
   * @default 100
   */
  maxItemsPerList?: number;

  /**
   * Name for default favorites list
   * @default "Favorites"
   */
  defaultListName?: string;

  /**
   * Description for default favorites list
   * @default "Your favorite items"
   */
  defaultListDescription?: string;

  /**
   * Automatically create default list for users
   * - When true: Creates default list on new user signup
   * - When true: Also creates default list for existing users on first query (lazy creation)
   * - When false: No automatic list creation
   * @default true
   */
  createDefaultList?: boolean;

  /**
   * Optional validation function for entities
   * Useful for validating against external APIs
   */
  validateEntity?: (entityId: TEntity) => Promise<boolean>;

  /**
   * Enable sharing and collaboration features
   */
  sharing?: {
    enabled: boolean;
    maxShares?: number;          // Default: 50
    inviteExpirationHours?: number; // Default: 168 (7 days)
    enablePublicDiscovery?: boolean; // Default: true
  };

  /**
   * Schema customization - extend tables with custom fields
   */
  schema?: {
    lists?: Record<string, any>;
    listItems?: Record<string, any>;
    listShares?: Record<string, any>;
    listInvites?: Record<string, any>;
  };
}
```

## API Reference

### Lists Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/lists` | Get all user lists with filtering/sorting |
| GET | `/api/auth/lists/:id` | Get specific list with items |
| POST | `/api/auth/lists` | Create new list |
| PATCH | `/api/auth/lists/:id` | Update list properties |
| DELETE | `/api/auth/lists/:id` | Delete list |
| POST | `/api/auth/lists/check-entity` | Check if entity exists in any list |

### Items Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/lists/:id/items` | Get list items with pagination |
| POST | `/api/auth/lists/:id/items` | Add item to list |
| PATCH | `/api/auth/lists/:listId/items/:itemId` | Update item |
| DELETE | `/api/auth/lists/:listId/items/:itemId` | Remove item |

### Bulk Operations Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/lists/:id/items/batch` | Batch add items |
| DELETE | `/api/auth/lists/:id/items/batch` | Batch remove items |
| POST | `/api/auth/lists/move-items` | Move items between lists |
| POST | `/api/auth/lists/:id/duplicate` | Duplicate list |
| POST | `/api/auth/lists/import` | Import list from JSON |
| GET | `/api/auth/lists/:id/export` | Export list to JSON |

### Sharing Endpoints (when enabled)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/lists/:id/invite` | Invite user to list |
| GET | `/api/auth/lists/:id/invites` | Get list invites |
| POST | `/api/auth/invites/accept` | Accept invite |
| POST | `/api/auth/invites/reject` | Reject invite |
| GET | `/api/auth/lists/:id/members` | Get list members |
| PATCH | `/api/auth/lists/:id/members/:userId` | Update member permission |
| DELETE | `/api/auth/lists/:id/members/:userId` | Revoke access |

## TypeScript Types

All types are fully exported and can be imported:

```typescript
import type {
  List,
  ListItem,
  ListWithItems,
  CreateListInput,
  UpdateListInput,
  AddItemToListInput,
  SharePermission,
  BatchOperationResult,
  ListExportFormat,
  // ... and more
} from '@anime-pack/better-auth-lists';
```

## Migration & Existing Users

### Adding Plugin to Existing Better-Auth Instances

When adding this plugin to a Better-Auth instance that already has users, the plugin automatically handles the migration:

**Default Behavior (`createDefaultList: true`):**
- ✅ **New users**: Get default list immediately on signup
- ✅ **Existing users**: Get default list automatically on first query to `/lists` endpoint
- ✅ **Lazy creation**: No manual migration needed - lists are created on-demand

**Example Scenario:**
```typescript
// Your existing Better-Auth setup with 1000 users
const auth = betterAuth({
  plugins: [
    listsPlugin<number>({
      createDefaultList: true, // Default - enables lazy creation
      defaultListName: 'Favorites',
    }),
  ],
});

// Existing user logs in and queries their lists
// → Plugin detects they have no lists
// → Automatically creates default "Favorites" list
// → Returns the newly created list
const lists = await authClient.lists.getUserLists();
// First call: Creates + returns default list
// Subsequent calls: Returns existing list
```

**Disabling Automatic Creation:**
```typescript
listsPlugin<number>({
  createDefaultList: false, // Users must manually create their first list
})
```

**Why This Matters:**
- No need to run database migrations for existing users
- No risk of creating thousands of lists at once
- Users get lists only when they actually use the feature
- Clean migration path for production deployments

## Use Cases & Examples

### Anime Tracking (MyAnimeList-style)

```typescript
const auth = betterAuth({
  plugins: [
    listsPlugin<number>({
      defaultListName: 'Watching',
      maxCustomLists: 15,
      validateEntity: async (mal_id) => {
        const anime = await jikanAPI.getAnimeById(mal_id);
        return anime !== null;
      },
    }),
  ],
});

// User creates custom lists
await authClient.lists.create({ name: 'Completed' });
await authClient.lists.create({ name: 'Plan to Watch' });
await authClient.lists.create({ name: 'Dropped' });
```

### Movie Watchlist (TMDB IDs)

```typescript
const auth = betterAuth({
  plugins: [
    listsPlugin<number>({
      defaultListName: 'Watchlist',
      maxItemsPerList: 200,
      validateEntity: async (tmdbId) => {
        const movie = await tmdb.getMovie(tmdbId);
        return movie.status_code !== 34; // Not found
      },
    }),
  ],
});
```

### Book Collections (ISBN/String IDs)

```typescript
const auth = betterAuth({
  plugins: [
    listsPlugin<string>({
      defaultListName: 'Reading List',
      maxCustomLists: 20,
      validateEntity: async (isbn) => {
        const book = await googleBooks.get(isbn);
        return book.totalItems > 0;
      },
      sharing: {
        enabled: true, // Book clubs can share reading lists
      },
    }),
  ],
});
```

### E-commerce Wishlist (Product UUIDs)

```typescript
const auth = betterAuth({
  plugins: [
    listsPlugin<string>({
      defaultListName: 'Wishlist',
      maxCustomLists: 5,
      sharing: {
        enabled: true, // Share wishlists with family
        maxShares: 10,
      },
    }),
  ],
});
```

## Error Handling

The plugin provides standardized error responses:

```typescript
import { ListErrorCode, isListError } from '@anime-pack/better-auth-lists';

try {
  await authClient.items.add(listId, { entityId: 999 });
} catch (error) {
  if (isListError(error)) {
    switch (error.code) {
      case ListErrorCode.LIST_FULL:
        console.error('List is at maximum capacity');
        break;
      case ListErrorCode.ITEM_ALREADY_EXISTS:
        console.error('Item already in list');
        break;
      case ListErrorCode.ENTITY_VALIDATION_FAILED:
        console.error('Invalid entity ID');
        break;
      // ... handle other error codes
    }
  }
}
```

### Error Codes

- `LIST_NOT_FOUND` - List does not exist or no access
- `LIST_LIMIT_REACHED` - Maximum custom lists reached
- `LIST_FULL` - List at maximum item capacity
- `ITEM_NOT_FOUND` - Item not found in list
- `ITEM_ALREADY_EXISTS` - Item already exists in list
- `PERMISSION_DENIED` - Insufficient permissions
- `INVALID_INVITE` - Invalid or expired invite
- `VALIDATION_FAILED` - Input validation failed
- `ENTITY_VALIDATION_FAILED` - Entity validation hook failed
- `CANNOT_DELETE_DEFAULT` - Cannot delete default favorites list
- `SHARE_LIMIT_REACHED` - Maximum shares reached

## Roadmap

- [x] Fix Better-Auth v1.4.5+ compatibility
- [x] Optimize type safety (remove unnecessary type assertions)
- [ ] Add comprehensive test suite
- [ ] Performance optimization (caching, query optimization)
- [ ] Webhook/event system
- [ ] Rate limiting for bulk operations
- [ ] Import adapters for MAL, Trakt, Letterboxd
- [ ] Offline support documentation
- [ ] Multi-tenancy support
- [ ] Soft delete feature
- [ ] OpenAPI spec generation

## Known Issues & Limitations

### Better-Auth HTTP Method Limitations

Better-Auth has two key limitations that affect REST endpoint design:

#### 1. DELETE Method with Body Parameters

Due to a limitation in Better-Auth's underlying `better-fetch` library, DELETE requests with body parameters are not properly supported (the `Content-Type` header requirement conflicts with the HTTP spec for DELETE methods without bodies).

**Our Solution:** All deletion endpoints use `POST` method with URL paths ending in `/remove` or `/revoke`:

#### 2. PATCH Method in pathMethods

Better-Auth's `pathMethods` configuration only supports `GET` and `POST` methods. PATCH (and DELETE) methods cannot be registered in `pathMethods` and must be called directly through `getActions` with explicit method specification.

**Impact:** Update operations (PATCH) work perfectly but cannot use the simplified `pathMethods` registration. All PATCH endpoints are defined in `getActions` with explicit `method: 'PATCH'`.

**Affected Operations:**

| Operation | Method | Endpoint | Limitation |
|-----------|--------|----------|------------|
| Update list | `PATCH` | `/lists/:id` | Cannot use pathMethods |
| Update list item | `PATCH` | `/lists/:id/items/:itemId` | Cannot use pathMethods |
| Update member permission | `PATCH` | `/lists/:id/members/:userId` | Cannot use pathMethods |
| Remove item from list | `POST` | `/lists/:listId/items/remove` | DELETE not supported with body |
| Delete list | `POST` | `/lists/:id/remove` | DELETE not supported with body |
| Batch remove items | `POST` | `/lists/:id/items/batch/remove` | DELETE not supported with body |
| Revoke member access | `POST` | `/lists/:id/members/revoke` | DELETE not supported with body |

**Example:**
```typescript
// ❌ Would fail with Better-Auth (DELETE with body)
await fetch('/lists/:listId/items/:itemId', { method: 'DELETE' })

// ✅ Works perfectly (POST with body)
await authClient.items.remove(listId, itemId)
// Calls: POST /lists/:listId/items/remove { itemId }

// ✅ PATCH works but requires explicit method in getActions
await authClient.lists.update(listId, { name: 'New Name' })
// Calls: PATCH /lists/:id { name: 'New Name' }
```

This is transparent when using the provided client methods - they handle the correct endpoints and methods automatically.

**Related Issue:** These are known Better-Auth limitations that affect any plugin using DELETE or PATCH methods in `pathMethods`. We've implemented workarounds to ensure full compatibility.

## Testing

This plugin includes a comprehensive test suite using Vitest:

```bash
# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run tests with UI
bun run test:ui
```

### Test Coverage

- ✅ Plugin configuration and options
- ✅ Schema definitions
- ✅ All endpoint registrations
- ✅ Client actions (lists, items, bulk, sharing)
- ✅ Error classes and codes
- ✅ Type safety for generic entity types

See [tests/README.md](./tests/README.md) for detailed testing documentation.

## Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## License

MIT © [anime-pack](https://github.com/anime-pack)

## Support

- **Issues:** [GitHub Issues](https://github.com/anime-pack/better-auth-lists/issues)
- **Better-Auth Docs:** [better-auth.com](https://better-auth.com)

## Acknowledgments

Built on top of the excellent [Better-Auth](https://better-auth.com) authentication framework.
