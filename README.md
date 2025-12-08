# @anime-pack/better-auth-lists

> **🚧 Early Development Status**
> 
> This plugin is currently in active development and has known TypeScript compatibility issues with Better-Auth v1.4.5+. 
> The API surface and types are defined, but require updates to match the latest Better-Auth plugin API patterns.
> 
> **Status:** Core functionality implemented, needs Better-Auth API compatibility fixes before production use.

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

## Installation

```bash
npm install @anime-pack/better-auth-lists
# or
pnpm add @anime-pack/better-auth-lists
# or
bun add @anime-pack/better-auth-lists
```

**Peer Dependencies:**
- `better-auth >= 1.0.0`
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
const { added, item } = await authClient.items.toggle(listId, animeId);
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

## Known Issues

⚠️ **Better-Auth v1.4.5+ Compatibility**

The plugin currently has TypeScript compatibility issues with Better-Auth v1.4.5+ due to API changes. Fixes needed:

1. Update adapter method calls to match latest Better-Auth API
2. Fix session access patterns
3. Adjust schema type definitions
4. Update endpoint creation patterns

Track progress in [Issues](https://github.com/anime-pack/better-auth-lists/issues).

## Roadmap

- [ ] Fix Better-Auth v1.4.5+ compatibility
- [ ] Add comprehensive test suite
- [ ] Performance optimization (caching, query optimization)
- [ ] Webhook/event system
- [ ] Rate limiting for bulk operations
- [ ] Import adapters for MAL, Trakt, Letterboxd
- [ ] Offline support documentation
- [ ] Multi-tenancy support
- [ ] Soft delete feature
- [ ] OpenAPI spec generation

## Contributing

Contributions welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

## License

MIT © [anime-pack](https://github.com/anime-pack)

## Support

- **Issues:** [GitHub Issues](https://github.com/anime-pack/better-auth-lists/issues)
- **Better-Auth Docs:** [better-auth.com](https://better-auth.com)

## Acknowledgments

Built on top of the excellent [Better-Auth](https://better-auth.com) authentication framework.
