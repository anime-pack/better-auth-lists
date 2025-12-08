import type { BetterAuthPlugin } from 'better-auth';
import type { ListsPluginOptions } from './types';
import { ListErrorCode } from './types';
import { createListsSchema, mergeSchema } from './schema';
import { createListEndpoints } from './endpoints/lists';
import { createItemEndpoints } from './endpoints/items';
import { createBulkEndpoints } from './endpoints/bulk';
import { createSharingEndpoints } from './endpoints/sharing';

/**
 * TODO: Testing Strategy
 * - Add comprehensive test suite using Vitest
 * - Include unit tests for all endpoint handlers
 * - Add integration tests with mock Better-Auth context
 * - Test type inference with tsd
 * - Provide test utilities for consumers
 * - Test edge cases: concurrent operations, limits, validation
 * 
 * TODO: Performance Optimization
 * - Implement caching strategies for frequently accessed lists
 * - Add database query optimization hints
 * - Consider virtual scrolling for large lists (client-side)
 * - Add cursor-based pagination for better performance
 * - Document recommended database indexes for production
 * - Add batch query optimization for list item counts
 * 
 * TODO: Webhook/Event System
 * - Add optional webhook configuration for list events
 * - Emit events through Better-Auth's hook system
 * - Support custom event handlers (onListCreated, onItemAdded, etc.)
 * - Enable analytics/logging integrations
 * - Document event payload schemas
 * 
 * TODO: Rate Limiting
 * - Implement granular rate limits for bulk operations
 * - Set stricter limits for batch operations vs single operations
 * - Add configurable per-user quotas
 * - Document recommended rate limit values
 * - Example: 100 items/request for batch add, 10 duplications/hour
 * 
 * TODO: Generic Import Adapters
 * - Create pluggable import adapter interface
 * - Support popular services (MyAnimeList XML, Trakt JSON, Letterboxd CSV)
 * - Provide validation and transformation helpers
 * - Make adapters service-agnostic where possible
 * - Document adapter implementation guide
 * 
 * TODO: Offline Support Patterns
 * - Document client-side caching with optimistic updates
 * - Provide sync conflict resolution examples
 * - Suggest IndexedDB/localStorage integration patterns
 * - Include sample service worker for offline queue
 * - Document best practices for offline-first architectures
 * 
 * TODO: Multi-Tenancy Support
 * - Add optional organization/workspace scoping
 * - Support team-based list ownership beyond userId
 * - Enable list inheritance/sharing at org level
 * - Document integration with Better-Auth organization plugin
 * 
 * TODO: Soft Delete Feature
 * - Implement as feature flag option
 * - Add deletedAt timestamp to schema
 * - Enable list/item recovery within timeframe
 * - Provide cleanup/purge utilities
 * - Balance audit trails with GDPR compliance
 */

/**
 * Creates a generic, type-safe lists plugin for Better-Auth
 * 
 * @template TEntity - The type of entity IDs (string | number)
 * @param options - Plugin configuration options
 * @returns BetterAuthPlugin instance
 * 
 * @example
 * ```typescript
 * // For anime IDs (numbers)
 * import { listsPlugin } from '@anime-pack/better-auth-lists';
 * 
 * const auth = betterAuth({
 *   plugins: [
 *     listsPlugin<number>({
 *       maxCustomLists: 10,
 *       maxItemsPerList: 100,
 *       validateEntity: async (animeId) => {
 *         // Validate against MAL API
 *         const response = await fetch(`https://api.myanimelist.net/v2/anime/${animeId}`);
 *         return response.ok;
 *       },
 *       sharing: {
 *         enabled: true,
 *         maxShares: 50,
 *       },
 *     }),
 *   ],
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // For movie IDs (strings)
 * const auth = betterAuth({
 *   plugins: [
 *     listsPlugin<string>({
 *       defaultListName: 'Watchlist',
 *       maxItemsPerList: 200,
 *     }),
 *   ],
 * });
 * ```
 */
export function listsPlugin<TEntity = string | number>(
  options?: ListsPluginOptions<TEntity>
): BetterAuthPlugin {
  const config: ListsPluginOptions<TEntity> = {
    maxCustomLists: 10,
    maxItemsPerList: 100,
    defaultListName: 'Favorites',
    defaultListDescription: 'Your favorite items',
    createDefaultList: true,
    ...options,
  };

  // Create schema with optional sharing tables
  const baseSchema = createListsSchema(config);
  const schema = mergeSchema(baseSchema, config.schema);

  // Create all endpoints
  const listEndpoints = createListEndpoints(config);
  const itemEndpoints = createItemEndpoints(config);
  const bulkEndpoints = createBulkEndpoints(config);
  const sharingEndpoints = config.sharing?.enabled ? createSharingEndpoints(config) : undefined;

  return {
    id: 'lists',
    
    // Register database schema
    schema,

    // Error codes for consistent error handling
    $ERROR_CODES: ListErrorCode,

    // Type inference for client
    $Infer: {
      // Types will be automatically inferred by Better-Auth
    },

    // Lifecycle hooks
    init(ctx) {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                // Create default favorites list when user signs up (if enabled)
                after: async (user) => {
                  if (!config.createDefaultList) {
                    return;
                  }
                  
                  try {
                    await ctx.adapter.create({
                      model: 'lists',
                      data: {
                        userId: user.id,
                        name: config.defaultListName || 'Favorites',
                        description: config.defaultListDescription || 'Your favorite items',
                        type: 'default',
                        isPublic: false,
                        maxItems: config.maxItemsPerList || 100,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    });
                  } catch (error) {
                    console.error('Failed to create default list for user:', error);
                    // Don't throw - user creation should still succeed
                  }
                },
              },
            },
          },
        },
      };
    },

    // Register all endpoints
    endpoints: (sharingEndpoints
      ? {
          ...listEndpoints,
          ...itemEndpoints,
          ...bulkEndpoints,
          ...sharingEndpoints,
        }
      : {
          ...listEndpoints,
          ...itemEndpoints,
          ...bulkEndpoints,
        }) as any,
  };
}

// Export all types for consumer use
export * from './types';
export * from './errors';
export { ListErrorCode };
