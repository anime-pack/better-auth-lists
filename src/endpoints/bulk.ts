import { createAuthEndpoint } from 'better-auth/api';
import type {
  ListsPluginOptions,
  List,
  ListItem,
  BatchOperationResult,
  ListExportFormat,
} from '../types';
import {
  ListNotFoundError,
  ItemAlreadyExistsError,
  ListFullError,
  EntityValidationFailedError,
} from '../errors';
import {
  batchAddItemsSchema,
  batchRemoveItemsSchema,
  moveItemsSchema,
  duplicateListSchema,
} from '../validation';
import { z } from 'zod';

/**
 * Create bulk operations endpoints
 */
export const createBulkEndpoints = <TEntity = string | number>(
  options: ListsPluginOptions<TEntity>
) => {
  return {
    /**
     * POST /api/auth/lists/:id/items/batch - Batch add items to list
     */
    batchAddItems: createAuthEndpoint(
      '/lists/:id/items/batch',
      {
        method: 'POST',
        body: batchAddItemsSchema,
        metadata: {
          openapi: {
            summary: 'Batch add items',
            description: 'Add multiple items to a list at once',
            tags: ['Bulk Operations'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const { items: itemsToAdd } = ctx.body;

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

        // Get existing items
        const existingItems = await ctx.context.internalAdapter.findMany({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
        });

        const result: BatchOperationResult<ListItem<TEntity>> = {
          success: [],
          failed: [],
          successCount: 0,
          failedCount: 0,
        };

        let currentPosition = existingItems.length;

        for (const itemToAdd of itemsToAdd) {
          try {
            // Check capacity
            if (existingItems.length + result.successCount >= list.maxItems) {
              result.failed.push({
                item: itemToAdd,
                error: `List is full (max ${list.maxItems} items)`,
              });
              result.failedCount++;
              continue;
            }

            // Validate entity if validation function provided
            if (options.validateEntity) {
              const isValid = await options.validateEntity(itemToAdd.entityId as TEntity);
              if (!isValid) {
                result.failed.push({
                  item: itemToAdd,
                  error: 'Entity validation failed',
                });
                result.failedCount++;
                continue;
              }
            }

            // Check if item already exists
            const exists = await ctx.context.internalAdapter.findOne({
              model: 'listItems',
              where: [
                { field: 'listId', value: listId },
                { field: 'entityId', value: String(itemToAdd.entityId) },
              ],
            });

            if (exists) {
              result.failed.push({
                item: itemToAdd,
                error: 'Item already exists in list',
              });
              result.failedCount++;
              continue;
            }

            // Create item
            const newItem = await ctx.context.internalAdapter.create<ListItem<TEntity>>({
              model: 'listItems',
              data: {
                id: crypto.randomUUID(),
                listId,
                entityId: String(itemToAdd.entityId),
                position: itemToAdd.position ?? currentPosition++,
                notes: itemToAdd.notes,
                addedAt: new Date(),
              },
            });

            result.success.push(newItem);
            result.successCount++;
          } catch (error) {
            result.failed.push({
              item: itemToAdd,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            result.failedCount++;
          }
        }

        return ctx.json({ data: result });
      }
    ),

    /**
     * DELETE /api/auth/lists/:id/items/batch - Batch remove items from list
     */
    batchRemoveItems: createAuthEndpoint(
      '/lists/:id/items/batch',
      {
        method: 'DELETE',
        body: batchRemoveItemsSchema,
        metadata: {
          openapi: {
            summary: 'Batch remove items',
            description: 'Remove multiple items from a list at once',
            tags: ['Bulk Operations'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const { itemIds, entityIds } = ctx.body;

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

        const result: BatchOperationResult<string> = {
          success: [],
          failed: [],
          successCount: 0,
          failedCount: 0,
        };

        // Remove by item IDs
        if (itemIds) {
          for (const itemId of itemIds) {
            try {
              const item = await ctx.context.internalAdapter.findOne({
                model: 'listItems',
                where: [
                  { field: 'id', value: itemId },
                  { field: 'listId', value: listId },
                ],
              });

              if (!item) {
                result.failed.push({ item: itemId, error: 'Item not found' });
                result.failedCount++;
                continue;
              }

              await ctx.context.internalAdapter.delete({
                model: 'listItems',
                where: [{ field: 'id', value: itemId }],
              });

              result.success.push(itemId);
              result.successCount++;
            } catch (error) {
              result.failed.push({
                item: itemId,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              result.failedCount++;
            }
          }
        }

        // Remove by entity IDs
        if (entityIds) {
          for (const entityId of entityIds) {
            try {
              const item = await ctx.context.internalAdapter.findOne({
                model: 'listItems',
                where: [
                  { field: 'listId', value: listId },
                  { field: 'entityId', value: String(entityId) },
                ],
              });

              if (!item) {
                result.failed.push({ item: entityId, error: 'Item not found' });
                result.failedCount++;
                continue;
              }

              await ctx.context.internalAdapter.delete({
                model: 'listItems',
                where: [{ field: 'id', value: item.id }],
              });

              result.success.push(item.id);
              result.successCount++;
            } catch (error) {
              result.failed.push({
                item: entityId,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
              result.failedCount++;
            }
          }
        }

        // Reorder remaining items
        const remainingItems = await ctx.context.internalAdapter.findMany<ListItem<TEntity>>({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
          sortBy: { field: 'position', direction: 'asc' },
        });

        for (let i = 0; i < remainingItems.length; i++) {
          if (remainingItems[i]!.position !== i) {
            await ctx.context.internalAdapter.update({
              model: 'listItems',
              where: [{ field: 'id', value: remainingItems[i]!.id }],
              data: { position: i },
            });
          }
        }

        return ctx.json({ data: result });
      }
    ),

    /**
     * POST /api/auth/lists/move-items - Move items between lists
     */
    moveItemsBetweenLists: createAuthEndpoint(
      '/lists/move-items',
      {
        method: 'POST',
        body: moveItemsSchema,
        metadata: {
          openapi: {
            summary: 'Move items between lists',
            description: 'Move multiple items from one list to another',
            tags: ['Bulk Operations'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const { sourceListId, targetListId, itemIds } = ctx.body;

        // Verify both lists exist and belong to user
        const [sourceList, targetList] = await Promise.all([
          ctx.context.internalAdapter.findOne<List>({
            model: 'lists',
            where: [
              { field: 'id', value: sourceListId },
              { field: 'userId', value: userId },
            ],
          }),
          ctx.context.internalAdapter.findOne<List>({
            model: 'lists',
            where: [
              { field: 'id', value: targetListId },
              { field: 'userId', value: userId },
            ],
          }),
        ]);

        if (!sourceList) {
          throw new ListNotFoundError(sourceListId);
        }
        if (!targetList) {
          throw new ListNotFoundError(targetListId);
        }

        // Get target list items for capacity check
        const targetItems = await ctx.context.internalAdapter.findMany({
          model: 'listItems',
          where: [{ field: 'listId', value: targetListId }],
        });

        const result: BatchOperationResult<ListItem<TEntity>> = {
          success: [],
          failed: [],
          successCount: 0,
          failedCount: 0,
        };

        let currentPosition = targetItems.length;

        for (const itemId of itemIds) {
          try {
            // Check target capacity
            if (targetItems.length + result.successCount >= targetList.maxItems) {
              result.failed.push({
                item: itemId,
                error: `Target list is full (max ${targetList.maxItems} items)`,
              });
              result.failedCount++;
              continue;
            }

            // Get item from source list
            const item = await ctx.context.internalAdapter.findOne<ListItem<TEntity>>({
              model: 'listItems',
              where: [
                { field: 'id', value: itemId },
                { field: 'listId', value: sourceListId },
              ],
            });

            if (!item) {
              result.failed.push({ item: itemId, error: 'Item not found in source list' });
              result.failedCount++;
              continue;
            }

            // Check if entity already exists in target list
            const existsInTarget = await ctx.context.internalAdapter.findOne({
              model: 'listItems',
              where: [
                { field: 'listId', value: targetListId },
                { field: 'entityId', value: item.entityId },
              ],
            });

            if (existsInTarget) {
              result.failed.push({ item: itemId, error: 'Item already exists in target list' });
              result.failedCount++;
              continue;
            }

            // Delete from source
            await ctx.context.internalAdapter.delete({
              model: 'listItems',
              where: [{ field: 'id', value: itemId }],
            });

            // Create in target
            const movedItem = await ctx.context.internalAdapter.create<ListItem<TEntity>>({
              model: 'listItems',
              data: {
                id: crypto.randomUUID(),
                listId: targetListId,
                entityId: item.entityId,
                position: currentPosition++,
                notes: item.notes,
                addedAt: new Date(),
              },
            });

            result.success.push(movedItem);
            result.successCount++;
          } catch (error) {
            result.failed.push({
              item: itemId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            result.failedCount++;
          }
        }

        return ctx.json({ data: result });
      }
    ),

    /**
     * POST /api/auth/lists/:id/duplicate - Duplicate a list
     */
    duplicateList: createAuthEndpoint(
      '/lists/:id/duplicate',
      {
        method: 'POST',
        body: duplicateListSchema,
        metadata: {
          openapi: {
            summary: 'Duplicate list',
            description: 'Create a copy of an existing list',
            tags: ['Bulk Operations'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const { newName, includeItems = true } = ctx.body;

        // Get original list
        const originalList = await ctx.context.internalAdapter.findOne<List>({
          model: 'lists',
          where: [
            { field: 'id', value: listId },
            { field: 'userId', value: userId },
          ],
        });

        if (!originalList) {
          throw new ListNotFoundError(listId);
        }

        // Create duplicate list
        const duplicateName = newName || `${originalList.name} (Copy)`;
        const newList = await ctx.context.internalAdapter.create<List>({
          model: 'lists',
          data: {
            id: crypto.randomUUID(),
            userId,
            name: duplicateName,
            description: originalList.description,
            type: 'custom',
            isPublic: false, // Always private by default
            maxItems: originalList.maxItems,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Copy items if requested
        if (includeItems) {
          const originalItems = await ctx.context.internalAdapter.findMany<ListItem<TEntity>>({
            model: 'listItems',
            where: [{ field: 'listId', value: listId }],
            sortBy: { field: 'position', direction: 'asc' },
          });

          for (const item of originalItems) {
            await ctx.context.internalAdapter.create({
              model: 'listItems',
              data: {
                id: crypto.randomUUID(),
                listId: newList.id,
                entityId: item.entityId,
                position: item.position,
                notes: item.notes,
                addedAt: new Date(),
              },
            });
          }
        }

        return ctx.json({ data: newList }, { status: 201 });
      }
    ),

    /**
     * POST /api/auth/lists/import - Import list from JSON
     */
    importList: createAuthEndpoint(
      '/lists/import',
      {
        method: 'POST',
        body: z.object({
          data: z.any(), // ListExportFormat
        }),
        metadata: {
          openapi: {
            summary: 'Import list',
            description: 'Import a list from JSON export format',
            tags: ['Bulk Operations'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const exportData = ctx.body.data as ListExportFormat<TEntity>;

        // Validate export format
        if (!exportData.version || !exportData.list || !exportData.items) {
          throw new Error('Invalid export format');
        }

        // Create list
        const newList = await ctx.context.internalAdapter.create<List>({
          model: 'lists',
          data: {
            id: crypto.randomUUID(),
            userId,
            name: exportData.list.name,
            description: exportData.list.description,
            type: 'custom',
            isPublic: false,
            maxItems: Math.min(
              exportData.list.maxItems,
              options.maxItemsPerList ?? 100
            ),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Import items
        const result: BatchOperationResult<ListItem<TEntity>> = {
          success: [],
          failed: [],
          successCount: 0,
          failedCount: 0,
        };

        for (const item of exportData.items) {
          try {
            const newItem = await ctx.context.internalAdapter.create<ListItem<TEntity>>({
              model: 'listItems',
              data: {
                id: crypto.randomUUID(),
                listId: newList.id,
                entityId: String(item.entityId),
                position: item.position,
                notes: item.notes,
                addedAt: new Date(),
              },
            });

            result.success.push(newItem);
            result.successCount++;
          } catch (error) {
            result.failed.push({
              item,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            result.failedCount++;
          }
        }

        return ctx.json({
          data: {
            list: newList,
            importResult: result,
          },
        }, { status: 201 });
      }
    ),

    /**
     * GET /api/auth/lists/:id/export - Export list to JSON
     */
    exportList: createAuthEndpoint(
      '/lists/:id/export',
      {
        method: 'GET',
        metadata: {
          openapi: {
            summary: 'Export list',
            description: 'Export a list to JSON format',
            tags: ['Bulk Operations'],
          },
        },
      },
      async (ctx) => {
        const userId = ctx.context.session.user.id;
        const listId = ctx.params.id;

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

        // Get items
        const items = await ctx.context.internalAdapter.findMany<ListItem<TEntity>>({
          model: 'listItems',
          where: [{ field: 'listId', value: listId }],
          sortBy: { field: 'position', direction: 'asc' },
        });

        const exportData: ListExportFormat<TEntity> = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          list: {
            name: list.name,
            description: list.description,
            type: list.type,
            isPublic: list.isPublic,
            maxItems: list.maxItems,
          },
          items: items.map((item) => ({
            entityId: item.entityId as TEntity,
            position: item.position,
            notes: item.notes,
            addedAt: item.addedAt.toISOString(),
          })),
          metadata: {
            itemCount: items.length,
            exportedBy: userId,
          },
        };

        return ctx.json({ data: exportData });
      }
    ),
  };
};
