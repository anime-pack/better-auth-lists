import { createAuthEndpoint } from 'better-auth/api';
import type { ListsPluginOptions, List, ListItem } from '../types';
import {
  ListNotFoundError,
  ItemNotFoundError,
  ItemAlreadyExistsError,
  ListFullError,
  EntityValidationFailedError,
  PermissionDeniedError,
} from '../errors';
import {
  addItemSchema,
  updateItemSchema,
  itemsQuerySchema,
} from '../validation';

/**
 * Create item management endpoints
 */
export const createItemEndpoints = <TEntity = string | number>(
  options: ListsPluginOptions<TEntity>
) => {
  return {
    /**
     * POST /api/auth/lists/:id/items - Add item to list
     */
    addItemToList: createAuthEndpoint(
      '/lists/:id/items',
      {
        method: 'POST',
        body: addItemSchema,
        metadata: {
          openapi: {
            summary: 'Add item to list',
            description: 'Add a new item (entity) to a list',
            tags: ['List Items'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const body = ctx.body;

        // Get list
        const list = await ctx.context.internalAdapter.findOne<List>({
          model: 'lists',
          where: [
            { field: 'id', value: listId },
            { field: 'userId', value: userId },
          ],
        });

        if (!list) {
          throw new ListNotFoundError(listId);
        }

        // Validate entity if validation function provided
        if (options.validateEntity) {
          const isValid = await options.validateEntity(body.entityId as TEntity);
          if (!isValid) {
            throw new EntityValidationFailedError(body.entityId);
          }
        }

        // Check if item already exists
        const existingItem = await ctx.context.internalAdapter.findOne({
          model: 'listItems',
          where: [
            { field: 'listId', value: listId },
            { field: 'entityId', value: String(body.entityId) },
          ],
        });

        if (existingItem) {
          throw new ItemAlreadyExistsError(body.entityId);
        }

        // Check list capacity
        const items = await ctx.context.internalAdapter.findMany({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
        });

        if (items.length >= list.maxItems) {
          throw new ListFullError(list.maxItems);
        }

        // Calculate position (append to end if not specified)
        const position = body.position ?? items.length;

        // Create item
        const newItem = await ctx.context.internalAdapter.create<ListItem<TEntity>>({
          model: 'listItems',
          data: {
            id: crypto.randomUUID(),
            listId,
            entityId: String(body.entityId),
            position,
            notes: body.notes,
            addedAt: new Date(),
          },
        });

        return ctx.json({ data: newItem }, { status: 201 });
      }
    ),

    /**
     * GET /api/auth/lists/:id/items - Get list items
     */
    getListItems: createAuthEndpoint(
      '/lists/:id/items',
      {
        method: 'GET',
        query: itemsQuerySchema,
        metadata: {
          openapi: {
            summary: 'Get list items',
            description: 'Retrieve all items from a list with pagination',
            tags: ['List Items'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const query = ctx.query || {};

        // Verify list access
        const list = await ctx.context.internalAdapter.findOne<List>({
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
        const items = await ctx.context.internalAdapter.findMany<ListItem<TEntity>>({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
          limit: query.limit,
          offset: query.page ? (query.page - 1) * (query.limit || 50) : 0,
          sortBy: { field: 'position', direction: 'asc' },
        });

        // Apply search filter if needed
        let filteredItems = items;
        if (query.search) {
          const searchLower = query.search.toLowerCase();
          filteredItems = items.filter(
            (item) => item.notes?.toLowerCase().includes(searchLower)
          );
        }

        // Get total count
        const totalItems = await ctx.context.internalAdapter.count?.({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
        }) || items.length;

        return ctx.json({
          data: filteredItems,
          meta: {
            total: totalItems,
            page: query.page,
            limit: query.limit || 50,
            hasMore: totalItems > (query.page || 1) * (query.limit || 50),
          },
        });
      }
    ),

    /**
     * PATCH /api/auth/lists/:listId/items/:itemId - Update list item
     */
    updateListItem: createAuthEndpoint(
      '/lists/:listId/items/:itemId',
      {
        method: 'PATCH',
        body: updateItemSchema,
        metadata: {
          openapi: {
            summary: 'Update list item',
            description: 'Update item properties (position, notes)',
            tags: ['List Items'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.listId;
        const itemId = ctx.params.itemId;
        const body = ctx.body;

        // Verify list access
        const list = await ctx.context.internalAdapter.findOne<List>({
          model: 'lists',
          where: [
            { field: 'id', value: listId },
            { field: 'userId', value: userId },
          ],
        });

        if (!list) {
          throw new ListNotFoundError(listId);
        }

        // Get item
        const item = await ctx.context.internalAdapter.findOne<ListItem<TEntity>>({
          model: 'listItems',
          where: [
            { field: 'id', value: itemId },
            { field: 'listId', value: listId },
          ],
        });

        if (!item) {
          throw new ItemNotFoundError(itemId);
        }

        // Update item
        const updated = await ctx.context.internalAdapter.update<ListItem<TEntity>>({
          model: 'listItems',
          where: [{ field: 'id', value: itemId }],
          data: body,
        });

        return ctx.json({ data: updated });
      }
    ),

    /**
     * DELETE /api/auth/lists/:listId/items/:itemId - Remove item from list
     */
    removeItemFromList: createAuthEndpoint(
      '/lists/:listId/items/:itemId',
      {
        method: 'DELETE',
        metadata: {
          openapi: {
            summary: 'Remove item from list',
            description: 'Remove an item from a list and reorder remaining items',
            tags: ['List Items'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.listId;
        const itemId = ctx.params.itemId;

        // Verify list access
        const list = await ctx.context.internalAdapter.findOne<List>({
          model: 'lists',
          where: [
            { field: 'id', value: listId },
            { field: 'userId', value: userId },
          ],
        });

        if (!list) {
          throw new ListNotFoundError(listId);
        }

        // Get item
        const item = await ctx.context.internalAdapter.findOne<ListItem<TEntity>>({
          model: 'listItems',
          where: [
            { field: 'id', value: itemId },
            { field: 'listId', value: listId },
          ],
        });

        if (!item) {
          throw new ItemNotFoundError(itemId);
        }

        // Delete item
        await ctx.context.internalAdapter.delete({
          model: 'listItems',
          where: [{ field: 'id', value: itemId }],
        });

        // Reorder remaining items
        const remainingItems = await ctx.context.internalAdapter.findMany<ListItem<TEntity>>({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
          sortBy: { field: 'position', direction: 'asc' },
        });

        // Update positions
        for (let i = 0; i < remainingItems.length; i++) {
          if (remainingItems[i]!.position !== i) {
            await ctx.context.internalAdapter.update({
              model: 'listItems',
              where: [{ field: 'id', value: remainingItems[i]!.id }],
              data: { position: i },
            });
          }
        }

        return ctx.json({ success: true });
      }
    ),
  };
};
