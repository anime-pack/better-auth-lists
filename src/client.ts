import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { listsPlugin } from './index';
import type {
  List,
  ListItem,
  ListWithItems,
  CreateListInput,
  UpdateListInput,
  AddItemToListInput,
  UpdateListItemInput,
  ShareListInput,
  BatchAddItemsInput,
  BatchRemoveItemsInput,
  MoveItemsInput,
  DuplicateListInput,
  ListsQueryParams,
  PaginatedListsResponse,
  BatchOperationResult,
  ListExportFormat,
  SharePermission,
} from './types';

/**
 * Client plugin for Better-Auth Lists
 * Provides type-safe actions and helpers for interacting with the lists plugin
 * 
 * @template TEntity - The entity ID type (should match server plugin)
 * 
 * @example
 * ```typescript
 * import { createAuthClient } from 'better-auth/client';
 * import { listsClient } from '@anime-pack/better-auth-lists/client';
 * 
 * const authClient = createAuthClient({
 *   plugins: [listsClient<number>()],
 * });
 * 
 * // Use the actions
 * const lists = await authClient.lists.getUserLists();
 * await authClient.lists.addItem(listId, animeId);
 * const isInList = await authClient.lists.isInAnyList(animeId);
 * ```
 */
export function listsClient<TEntity = string | number>() {
  return {
    id: 'lists',
    
    $InferServerPlugin: {} as ReturnType<typeof listsPlugin<TEntity>>,

    // Define path methods for REST endpoints
    pathMethods: {
      '/lists': 'GET',
      '/lists/:id': 'GET',
      '/lists/check-entity': 'POST',
      '/lists/:id/items': 'GET',
      '/lists/:id/items/batch': 'POST',
      '/lists/:id/duplicate': 'POST',
      '/lists/import': 'POST',
      '/lists/:id/export': 'GET',
      '/lists/move-items': 'POST',
      '/lists/:id/invite': 'POST',
      '/lists/:id/invites': 'GET',
      '/invites/accept': 'POST',
      '/invites/reject': 'POST',
      '/lists/:id/members': 'GET',
      '/lists/:id/members/:userId': 'PATCH',
    },

    // Provide custom actions
    getActions($fetch: any) {
      return {
        lists: {
          /**
           * Get all lists for the current user
           */
          async getUserLists(
            query?: ListsQueryParams
          ): Promise<PaginatedListsResponse<TEntity>> {
            const params = new URLSearchParams();
            if (query) {
              Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined) {
                  params.append(key, String(value));
                }
              });
            }
            
            const response = await $fetch('/lists' + (params.toString() ? `?${params}` : ''));
            return response;
          },

          /**
           * Get a specific list with items
           */
          async getList(listId: string): Promise<ListWithItems<TEntity>> {
            const response = await $fetch(`/lists/${listId}`);
            return response.data;
          },

          /**
           * Create a new list
           */
          async create(input: CreateListInput): Promise<List> {
            const response = await $fetch('/lists', {
              method: 'POST',
              body: input,
            });
            return response.data;
          },

          /**
           * Update a list
           */
          async update(listId: string, input: UpdateListInput): Promise<List> {
            const response = await $fetch(`/lists/${listId}`, {
              method: 'PATCH',
              body: input,
            });
            return response.data;
          },

          /**
           * Delete a list
           */
          async delete(listId: string): Promise<boolean> {
            const response = await $fetch(`/lists/${listId}`, {
              method: 'DELETE',
            });
            return response.success;
          },

          /**
           * Check if an entity exists in any user list
           */
          async isInAnyList(entityId: TEntity): Promise<{
            entityId: TEntity;
            inLists: Array<{ listId: string; listName: string }>;
            count: number;
          }> {
            const response = await $fetch('/lists/check-entity', {
              method: 'POST',
              body: { entityId },
            });
            return response.data;
          },
        },

        items: {
          /**
           * Add an item to a list
           */
          async add(
            listId: string,
            input: AddItemToListInput<TEntity>
          ): Promise<ListItem<TEntity>> {
            const response = await $fetch(`/lists/${listId}/items`, {
              method: 'POST',
              body: input,
            });
            return response.data;
          },

          /**
           * Get items from a list
           */
          async getItems(
            listId: string,
            query?: { page?: number; limit?: number; search?: string }
          ): Promise<{
            data: ListItem<TEntity>[];
            meta: { total: number; page?: number; limit: number; hasMore: boolean };
          }> {
            const params = new URLSearchParams();
            if (query) {
              Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined) {
                  params.append(key, String(value));
                }
              });
            }
            
            return await $fetch(`/lists/${listId}/items` + (params.toString() ? `?${params}` : ''));
          },

          /**
           * Update a list item
           */
          async update(
            listId: string,
            itemId: string,
            input: UpdateListItemInput
          ): Promise<ListItem<TEntity>> {
            const response = await $fetch(`/lists/${listId}/items/${itemId}`, {
              method: 'PATCH',
              body: input,
            });
            return response.data;
          },

          /**
           * Remove an item from a list
           */
          async remove(listId: string, itemId: string): Promise<boolean> {
            const response = await $fetch(`/lists/${listId}/items/${itemId}`, {
              method: 'DELETE',
            });
            return response.success;
          },

          /**
           * Toggle an item in a list (add if not present, remove if present)
           */
          async toggle(
            listId: string,
            entityId: TEntity,
            notes?: string
          ): Promise<{ added: boolean; item?: ListItem<TEntity> }> {
            // Get list to check if item exists
            const list = await $fetch(`/lists/${listId}`);
            const existingItem = list.data.items.find(
              (item: ListItem<TEntity>) => item.entityId === entityId
            );

            if (existingItem) {
              // Remove item
              await $fetch(`/lists/${listId}/items/${existingItem.id}`, {
                method: 'DELETE',
              });
              return { added: false };
            } else {
              // Add item
              const response = await $fetch(`/lists/${listId}/items`, {
                method: 'POST',
                body: { entityId, notes },
              });
              return { added: true, item: response.data };
            }
          },
        },

        bulk: {
          /**
           * Add multiple items to a list at once
           */
          async addItems(
            listId: string,
            input: BatchAddItemsInput<TEntity>
          ): Promise<BatchOperationResult<ListItem<TEntity>>> {
            const response = await $fetch(`/lists/${listId}/items/batch`, {
              method: 'POST',
              body: input,
            });
            return response.data;
          },

          /**
           * Remove multiple items from a list at once
           */
          async removeItems(
            listId: string,
            input: BatchRemoveItemsInput<TEntity>
          ): Promise<BatchOperationResult<string>> {
            const response = await $fetch(`/lists/${listId}/items/batch`, {
              method: 'DELETE',
              body: input,
            });
            return response.data;
          },

          /**
           * Move items between lists
           */
          async moveItems(
            input: MoveItemsInput
          ): Promise<BatchOperationResult<ListItem<TEntity>>> {
            const response = await $fetch('/lists/move-items', {
              method: 'POST',
              body: input,
            });
            return response.data;
          },

          /**
           * Duplicate a list
           */
          async duplicate(listId: string, input?: DuplicateListInput): Promise<List> {
            const response = await $fetch(`/lists/${listId}/duplicate`, {
              method: 'POST',
              body: input || {},
            });
            return response.data;
          },

          /**
           * Import a list from JSON
           */
          async import(data: ListExportFormat<TEntity>): Promise<{
            list: List;
            importResult: BatchOperationResult<ListItem<TEntity>>;
          }> {
            const response = await $fetch('/lists/import', {
              method: 'POST',
              body: { data },
            });
            return response.data;
          },

          /**
           * Export a list to JSON
           */
          async export(listId: string): Promise<ListExportFormat<TEntity>> {
            const response = await $fetch(`/lists/${listId}/export`);
            return response.data;
          },
        },

        sharing: {
          /**
           * Invite a user to a list
           */
          async invite(listId: string, input: ShareListInput) {
            const response = await $fetch(`/lists/${listId}/invite`, {
              method: 'POST',
              body: input,
            });
            return response.data;
          },

          /**
           * Get all invites for a list
           */
          async getInvites(listId: string) {
            const response = await $fetch(`/lists/${listId}/invites`);
            return response.data;
          },

          /**
           * Accept a list invitation
           */
          async acceptInvite(token: string) {
            const response = await $fetch('/invites/accept', {
              method: 'POST',
              body: { token },
            });
            return response.data;
          },

          /**
           * Reject a list invitation
           */
          async rejectInvite(token: string) {
            const response = await $fetch('/invites/reject', {
              method: 'POST',
              body: { token },
            });
            return response.success;
          },

          /**
           * Get all members of a list
           */
          async getMembers(listId: string) {
            const response = await $fetch(`/lists/${listId}/members`);
            return response.data;
          },

          /**
           * Update a member's permission
           */
          async updatePermission(
            listId: string,
            userId: string,
            permission: SharePermission
          ) {
            const response = await $fetch(`/lists/${listId}/members/${userId}`, {
              method: 'PATCH',
              body: { permission },
            });
            return response.data;
          },

          /**
           * Revoke a user's access to a list
           */
          async revoke(listId: string, userId: string) {
            const response = await $fetch(`/lists/${listId}/members/${userId}`, {
              method: 'DELETE',
            });
            return response.success;
          },
        },
      };
    },

    // Atom listeners for state synchronization
    atomListeners: [
      {
        matcher: (path: string) => path.startsWith('/lists'),
        signal: '$sessionSignal',
      },
    ],
  } satisfies BetterAuthClientPlugin;
}

// Re-export types for consumer use
export type {
  List,
  ListItem,
  ListWithItems,
  CreateListInput,
  UpdateListInput,
  AddItemToListInput,
  UpdateListItemInput,
  ShareListInput,
  BatchAddItemsInput,
  BatchRemoveItemsInput,
  MoveItemsInput,
  DuplicateListInput,
  ListsQueryParams,
  PaginatedListsResponse,
  BatchOperationResult,
  ListExportFormat,
  SharePermission,
} from './types';
