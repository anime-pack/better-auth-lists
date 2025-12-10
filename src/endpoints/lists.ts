import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import { z } from 'zod';
import type { ListsPluginOptions, List, ListWithItems, PaginatedListsResponse } from '../types';
import {
    ListNotFoundError,
    ListLimitReachedError,
    CannotDeleteDefaultError,
    PermissionDeniedError,
} from '../errors';
import {
    createListSchema,
    updateListSchema,
    listsQuerySchema,
    checkEntitySchema,
} from '../validation';

/**
 * Helper function to create default list for existing users (lazy creation)
 */
async function ensureDefaultList<TEntity>(
    adapter: any,
    userId: string,
    options: ListsPluginOptions<TEntity>
): Promise<void> {
    if (!options.createDefaultList) {
        return;
    }

    try {
        // Check if user has any lists
        const existingLists = await adapter.findMany({
            model: 'lists',
            where: [{ field: 'userId', value: userId }],
            limit: 1,
        });

        // If user has no lists, create default one
        if (existingLists.length === 0) {
            await adapter.create({
                model: 'lists',
                data: {
                    userId,
                    name: options.defaultListName || 'Favorites',
                    description: options.defaultListDescription || 'Your favorite items',
                    type: 'default',
                    isPublic: false,
                    maxItems: options.maxItemsPerList || 100,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });
        }
    } catch (error) {
        console.error('Failed to create default list for existing user:', error);
        // Don't throw - query should still proceed
    }
}

/**
 * Create list management endpoints
 */
export const createListEndpoints = <TEntity = string | number>(
    options: ListsPluginOptions<TEntity>
) => {
    return {
        /**
         * GET /api/auth/lists - Get all lists for current user
         */
        getUserLists: createAuthEndpoint(
            '/lists',
            {
                method: 'GET',
                query: listsQuerySchema,
                use: [sessionMiddleware],
                metadata: {
                    openapi: {
                        summary: 'Get user lists',
                        description:
                            'Retrieve all lists for the authenticated user with filtering and pagination',
                        tags: ['Lists'],
                        responses: {
                            200: {
                                description: 'Lists retrieved successfully',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                data: { type: 'array' },
                                                meta: { type: 'object' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            async (ctx) => {
                if (!ctx.context.session) {
                    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const userId = ctx.context.session.user.id;
                const query = ctx.query || {};

                // Ensure existing users without lists get a default list (lazy creation)
                await ensureDefaultList(ctx.context.adapter, userId, options);

                // Build where conditions
                const whereConditions: any[] = [{ field: 'userId', value: userId }];

                if (query.type) {
                    whereConditions.push({ field: 'type', value: query.type });
                }

                if (query.isPublic !== undefined) {
                    whereConditions.push({ field: 'isPublic', value: query.isPublic });
                }

                // Date filters
                if (query.createdAfter) {
                    whereConditions.push({
                        field: 'createdAt',
                        operator: 'gte',
                        value: new Date(query.createdAfter),
                    });
                }

                if (query.createdBefore) {
                    whereConditions.push({
                        field: 'createdAt',
                        operator: 'lte',
                        value: new Date(query.createdBefore),
                    });
                }

                // Get lists
                const lists = await ctx.context.adapter.findMany<List>({
                    model: 'lists',
                    where: whereConditions,
                    limit: query.limit,
                    offset: query.page ? (query.page - 1) * (query.limit || 20) : 0,
                    sortBy: {
                        field: query.sortBy || 'createdAt',
                        direction: query.order || 'desc',
                    },
                });

                // Get item counts for each list
                const listsWithCounts: ListWithItems<TEntity>[] = await Promise.all(
                    lists.map(async (list) => {
                        const items = await ctx.context.adapter.findMany({
                            model: 'listItems',
                            where: [{ field: 'listId', value: list.id }],
                        });

                        // Apply search filter if needed
                        let filteredLists = lists;
                        if (query.search) {
                            const searchLower = query.search.toLowerCase();
                            filteredLists = lists.filter(
                                (l) =>
                                    l.name.toLowerCase().includes(searchLower) ||
                                    l.description?.toLowerCase().includes(searchLower)
                            );
                        }

                        return {
                            ...list,
                            items: [],
                            itemCount: items.length,
                        };
                    })
                );

                // Get total count for pagination
                const totalLists =
                    (await ctx.context.adapter.count?.({
                        model: 'lists',
                        where: whereConditions,
                    })) || listsWithCounts.length;

                const response: PaginatedListsResponse<TEntity> = {
                    data: listsWithCounts,
                    meta: {
                        total: totalLists,
                        page: query.page,
                        limit: query.limit || 20,
                        hasMore: totalLists > (query.page || 1) * (query.limit || 20),
                    },
                };

                return ctx.json(response);
            }
        ),

        /**
         * GET /api/auth/lists/:id - Get specific list with items
         */
        getList: createAuthEndpoint(
            '/lists/:id',
            {
                method: 'GET',
                use: [sessionMiddleware],
                metadata: {
                    openapi: {
                        summary: 'Get list by ID',
                        description: 'Retrieve a specific list with all its items',
                        tags: ['Lists'],
                    },
                },
            },
            async (ctx) => {
                if (!ctx.context.session) {
                    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const userId = ctx.context.session.user.id;
                const listId = ctx.params.id;

                // Get list
                const list = await ctx.context.adapter.findOne<List>({
                    model: 'lists',
                    where: [
                        { field: 'id', value: listId },
                        { field: 'userId', value: userId },
                    ],
                });

                if (!list) {
                    throw new ListNotFoundError(listId);
                }

                // Get items
                const items = await ctx.context.adapter.findMany({
                    model: 'listItems',
                    where: [{ field: 'listId', value: listId }],
                    sortBy: { field: 'position', direction: 'asc' },
                });

                const response: ListWithItems<TEntity> = {
                    ...list,
                    items: items as any[],
                    itemCount: items.length,
                };

                return ctx.json({ data: response });
            }
        ),

        /**
         * POST /api/auth/lists - Create new list
         */
        createList: createAuthEndpoint(
            '/lists',
            {
                method: 'POST',
                body: createListSchema,
                use: [sessionMiddleware],
                metadata: {
                    openapi: {
                        summary: 'Create a new list',
                        description: 'Create a new custom list for the authenticated user',
                        tags: ['Lists'],
                    },
                },
            },
            async (ctx) => {
                if (!ctx.context.session) {
                    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const userId = ctx.context.session.user.id;
                const body = ctx.body;

                // Check custom list limit
                const existingLists = await ctx.context.adapter.findMany<List>({
                    model: 'lists',
                    where: [
                        { field: 'userId', value: userId },
                        { field: 'type', value: 'custom' },
                    ],
                });

                const maxLists = options.maxCustomLists ?? 10;
                if (existingLists.length >= maxLists) {
                    throw new ListLimitReachedError(maxLists);
                }

                // Create list
                const newList = await ctx.context.adapter.create<List>({
                    model: 'lists',
                    data: {
                        userId,
                        name: body.name,
                        description: body.description,
                        type: 'custom',
                        isPublic: body.isPublic ?? false,
                        maxItems: Math.min(body.maxItems ?? 100, options.maxItemsPerList ?? 100),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    } as any,
                });

                return ctx.json({ data: newList }, { status: 201 });
            }
        ),

        /**
         * PATCH /api/auth/lists/:id - Update list
         */
        updateList: createAuthEndpoint(
            '/lists/:id',
            {
                method: 'PATCH',
                body: updateListSchema,
                use: [sessionMiddleware],
                metadata: {
                    openapi: {
                        summary: 'Update a list',
                        description: 'Update list properties (name, description, visibility, etc.)',
                        tags: ['Lists'],
                    },
                },
            },
            async (ctx) => {
                if (!ctx.context.session) {
                    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const userId = ctx.context.session.user.id;
                const listId = ctx.params.id;
                const body = ctx.body;

                // Get list
                const list = await ctx.context.adapter.findOne<List>({
                    model: 'lists',
                    where: [
                        { field: 'id', value: listId },
                        { field: 'userId', value: userId },
                    ],
                });

                if (!list) {
                    throw new ListNotFoundError(listId);
                }

                // Update list
                const updated = await ctx.context.adapter.update<List>({
                    model: 'lists',
                    where: [{ field: 'id', value: listId }],
                    update: {
                        ...body,
                        updatedAt: new Date(),
                    },
                });

                return ctx.json({ data: updated });
            }
        ),

        /**
         * POST /api/auth/lists/:id/remove - Delete list
         * Note: Using POST instead of DELETE due to Better-Auth's better-fetch Content-Type limitation
         * Note: No body schema defined - client sends empty {} to satisfy better-fetch POST requirement
         * See: https://github.com/better-auth/better-auth/issues/XXX
         */
        deleteList: createAuthEndpoint(
            '/lists/:id/remove',
            {
                method: 'POST',
                use: [sessionMiddleware],
                metadata: {
                    openapi: {
                        summary: 'Delete a list',
                        description: 'Delete a custom list (cannot delete default favorites list)',
                        tags: ['Lists'],
                    },
                },
            },
            async (ctx) => {
                if (!ctx.context.session) {
                    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const userId = ctx.context.session.user.id;
                const listId = ctx.params.id;

                // Get list
                const list = await ctx.context.adapter.findOne<List>({
                    model: 'lists',
                    where: [
                        { field: 'id', value: listId },
                        { field: 'userId', value: userId },
                    ],
                });

                if (!list) {
                    throw new ListNotFoundError(listId);
                }

                // Prevent deleting default list
                if (list.type === 'default') {
                    throw new CannotDeleteDefaultError();
                }

                // Delete list (items will cascade)
                await ctx.context.adapter.delete({
                    model: 'lists',
                    where: [{ field: 'id', value: listId }],
                });

                return ctx.json({ success: true });
            }
        ),

        /**
         * GET /api/auth/lists/check-entity/:entityId - Check if entity is in any list
         */
        checkEntityInLists: createAuthEndpoint(
            '/lists/check-entity',
            {
                method: 'POST',
                body: checkEntitySchema,
                use: [sessionMiddleware],
                metadata: {
                    openapi: {
                        summary: 'Check entity in lists',
                        description: 'Check if an entity exists in any of the user lists',
                        tags: ['Lists'],
                    },
                },
            },
            async (ctx) => {
                if (!ctx.context.session) {
                    return new Response(JSON.stringify({ message: 'Unauthorized' }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
                const userId = ctx.context.session.user.id;
                const { entityId } = ctx.body;

                // Get all user lists
                const lists = await ctx.context.adapter.findMany<List>({
                    model: 'lists',
                    where: [{ field: 'userId', value: userId }],
                });

                // Check each list for the entity
                const listsWithEntity: Array<{ listId: string; listName: string }> = [];

                for (const list of lists) {
                    const item = await ctx.context.adapter.findOne({
                        model: 'listItems',
                        where: [
                            { field: 'listId', value: list.id },
                            { field: 'entityId', value: String(entityId) },
                        ],
                    });

                    if (item) {
                        listsWithEntity.push({
                            listId: list.id,
                            listName: list.name,
                        });
                    }
                }

                return ctx.json({
                    data: {
                        entityId,
                        inLists: listsWithEntity,
                        count: listsWithEntity.length,
                    },
                });
            }
        ),
    };
};
