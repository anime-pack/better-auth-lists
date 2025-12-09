import type { BetterAuthClientPlugin } from 'better-auth/client';
import type { BetterFetchOption } from '@better-fetch/fetch';
import type { listsPlugin } from './index';
import type {
    List,
    ListItem,
    ListWithItems,
    ListShare,
    ListInvite,
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
 * Type for Better-Auth client $fetch function
 * Better-fetch automatically wraps responses in { data, error }
 * Our server endpoints return the actual data (e.g., { data: List })
 * So the final structure is: { data: { data: List }, error: null }
 */
type BetterAuthFetch = <T = unknown>(
    path: string,
    options?: BetterFetchOption
) => Promise<{ data: T; error: any }>;

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
 * await authClient.items.add(listId, { entityId: animeId });
 * const result = await authClient.lists.isInAnyList(animeId);
 * ```
 */
export function listsClient<TEntity = string | number>() {
    return {
        id: 'lists',

        $InferServerPlugin: {} as ReturnType<typeof listsPlugin<TEntity>>,

        // Define path methods for REST endpoints
        // Note: Better-Auth's pathMethods only supports GET/POST methods
        // PATCH and DELETE methods must be called via getActions with explicit method specification
        pathMethods: {
            '/lists': 'GET',
            '/lists/:id': 'GET',
            '/lists/check-entity': 'POST',
            '/lists/:id/items': 'GET',
            '/lists/:id/items/batch': 'POST',
            '/lists/:id/items/toggle': 'POST',
            '/lists/:id/duplicate': 'POST',
            '/lists/import': 'POST',
            '/lists/:id/export': 'GET',
            '/lists/move-items': 'POST',
            '/lists/:id/invite': 'POST',
            '/lists/:id/invites': 'GET',
            '/invites/accept': 'POST',
            '/invites/reject': 'POST',
            '/lists/:id/members': 'GET',
            '/lists/:id/members/:userId': 'POST',
        },

        // Provide custom actions
        getActions($fetch: BetterAuthFetch) {
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

                        const response = await $fetch<PaginatedListsResponse<TEntity>>(
                            '/lists' + (params.toString() ? `?${params.toString()}` : '')
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!;
                    },

                    /**
                     * Get a specific list with items
                     */
                    async getList(listId: string): Promise<ListWithItems<TEntity>> {
                        const response = await $fetch<{ data: ListWithItems<TEntity> }>(
                            `/lists/${listId}`
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Create a new list
                     */
                    async create(input: CreateListInput): Promise<List> {
                        const response = await $fetch<{ data: List }>('/lists', {
                            method: 'POST',
                            body: input,
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Update a list
                     */
                    async update(listId: string, input: UpdateListInput): Promise<List> {
                        const response = await $fetch<{ data: List }>(`/lists/${listId}`, {
                            method: 'PATCH',
                            body: input,
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Delete a list
                     * Note: Uses POST instead of DELETE due to Better-Auth limitation
                     */
                    async delete(listId: string): Promise<boolean> {
                        const response = await $fetch<{ success: boolean }>(
                            `/lists/${listId}/remove`,
                            {
                                method: 'POST',
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.success;
                    },

                    /**
                     * Check if an entity exists in any user list
                     */
                    async isInAnyList(entityId: TEntity): Promise<{
                        entityId: TEntity;
                        inLists: Array<{ listId: string; listName: string }>;
                        count: number;
                    }> {
                        const response = await $fetch<{
                            data: {
                                entityId: TEntity;
                                inLists: Array<{ listId: string; listName: string }>;
                                count: number;
                            };
                        }>('/lists/check-entity', {
                            method: 'POST',
                            body: { entityId },
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
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
                        const response = await $fetch<{ data: ListItem<TEntity> }>(
                            `/lists/${listId}/items`,
                            {
                                method: 'POST',
                                body: input,
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
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

                        const response = await $fetch<{
                            data: ListItem<TEntity>[];
                            meta: { total: number; page?: number; limit: number; hasMore: boolean };
                        }>(`/lists/${listId}/items` + (params.toString() ? `?${params}` : ''));
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!;
                    },

                    /**
                     * Update a list item
                     */
                    async update(
                        listId: string,
                        itemId: string,
                        input: UpdateListItemInput
                    ): Promise<ListItem<TEntity>> {
                        const response = await $fetch<{ data: ListItem<TEntity> }>(
                            `/lists/${listId}/items/${itemId}`,
                            {
                                method: 'PATCH',
                                body: input,
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Remove an item from a list
                     * Note: Uses POST instead of DELETE due to Better-Auth limitation
                     */
                    async remove(listId: string, itemId: string): Promise<boolean> {
                        const response = await $fetch<{ success: boolean }>(
                            `/lists/${listId}/items/remove`,
                            {
                                method: 'POST',
                                body: { itemId },
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.success;
                    },

                    /**
                     * Toggle an item in a list (add if not present, remove if present)
                     */
                    async toggle(
                        listId: string,
                        entityId: TEntity,
                        notes?: string
                    ): Promise<{ added: boolean; item?: ListItem<TEntity> }> {
                        const response = await $fetch<{
                            added: boolean;
                            item?: ListItem<TEntity>;
                        }>(`/lists/${listId}/items/toggle`, {
                            method: 'POST',
                            body: { entityId, notes },
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!;
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
                        const response = await $fetch<{
                            data: BatchOperationResult<ListItem<TEntity>>;
                        }>(`/lists/${listId}/items/batch`, {
                            method: 'POST',
                            body: input,
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Remove multiple items from a list at once
                     * Note: Uses POST instead of DELETE due to Better-Auth limitation
                     */
                    async removeItems(
                        listId: string,
                        input: BatchRemoveItemsInput<TEntity>
                    ): Promise<BatchOperationResult<string>> {
                        const response = await $fetch<{ data: BatchOperationResult<string> }>(
                            `/lists/${listId}/items/batch/remove`,
                            {
                                method: 'POST',
                                body: input,
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Move items between lists
                     */
                    async moveItems(
                        input: MoveItemsInput
                    ): Promise<BatchOperationResult<ListItem<TEntity>>> {
                        const response = await $fetch<{
                            data: BatchOperationResult<ListItem<TEntity>>;
                        }>('/lists/move-items', {
                            method: 'POST',
                            body: input,
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Duplicate a list
                     */
                    async duplicate(listId: string, input?: DuplicateListInput): Promise<List> {
                        const response = await $fetch<{ data: List }>(
                            `/lists/${listId}/duplicate`,
                            {
                                method: 'POST',
                                body: input || {},
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Import a list from JSON
                     */
                    async import(data: ListExportFormat<TEntity>): Promise<{
                        list: List;
                        importResult: BatchOperationResult<ListItem<TEntity>>;
                    }> {
                        const response = await $fetch<{
                            data: {
                                list: List;
                                importResult: BatchOperationResult<ListItem<TEntity>>;
                            };
                        }>('/lists/import', {
                            method: 'POST',
                            body: { data },
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Export a list to JSON
                     */
                    async export(listId: string): Promise<ListExportFormat<TEntity>> {
                        const response = await $fetch<{ data: ListExportFormat<TEntity> }>(
                            `/lists/${listId}/export`
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },
                },

                sharing: {
                    /**
                     * Invite a user to a list
                     */
                    async invite(listId: string, input: ShareListInput) {
                        const response = await $fetch<{ data: ListInvite }>(
                            `/lists/${listId}/invite`,
                            {
                                method: 'POST',
                                body: input,
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Get all invites for a list
                     */
                    async getInvites(listId: string) {
                        const response = await $fetch<{ data: ListInvite[] }>(
                            `/lists/${listId}/invites`
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Accept a list invitation
                     */
                    async acceptInvite(token: string) {
                        const response = await $fetch<{ data: ListShare }>('/invites/accept', {
                            method: 'POST',
                            body: { token },
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Reject a list invitation
                     */
                    async rejectInvite(token: string) {
                        const response = await $fetch<{ success: boolean }>('/invites/reject', {
                            method: 'POST',
                            body: { token },
                        });
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.success;
                    },

                    /**
                     * Get all members of a list
                     */
                    async getMembers(listId: string) {
                        const response = await $fetch<{
                            data: {
                                owner: {
                                    userId: string;
                                    email?: string;
                                    name?: string;
                                    permission: SharePermission;
                                };
                                members: Array<{
                                    userId: string;
                                    email?: string;
                                    name?: string;
                                    permission: SharePermission;
                                    sharedAt: Date;
                                }>;
                            };
                        }>(`/lists/${listId}/members`);
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Update a member's permission
                     */
                    async updatePermission(
                        listId: string,
                        userId: string,
                        permission: SharePermission
                    ) {
                        const response = await $fetch<{ data: ListShare }>(
                            `/lists/${listId}/members/${userId}`,
                            {
                                method: 'PATCH',
                                body: { permission },
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.data;
                    },

                    /**
                     * Revoke a user's access to a list
                     * Note: Uses POST instead of DELETE due to Better-Auth limitation
                     */
                    async revoke(listId: string, userId: string) {
                        const response = await $fetch<{ success: boolean }>(
                            `/lists/${listId}/members/revoke`,
                            {
                                method: 'POST',
                                body: { userId },
                            }
                        );
                        if (response.error) {
                            throw response.error;
                        }
                        return response.data!.success;
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
