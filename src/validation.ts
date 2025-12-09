import { z } from 'zod';

/**
 * Zod schema for list type
 */
export const listTypeSchema = z.enum(['default', 'custom']);

/**
 * Zod schema for share permission
 */
export const sharePermissionSchema = z.enum(['view', 'edit', 'admin']);

/**
 * Zod schema for invite status
 */
export const inviteStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'expired']);

/**
 * Zod schema for creating a new list
 */
export const createListSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
    description: z.string().max(500, 'Description must be 500 characters or less').optional(),
    isPublic: z.boolean().default(false),
    maxItems: z.number().int().positive().max(1000, 'Max items cannot exceed 1000').default(100),
});

/**
 * Zod schema for updating a list
 */
export const updateListSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional(),
    maxItems: z.number().int().positive().max(1000).optional(),
});

/**
 * Zod schema for adding an item to a list
 */
export const addItemSchema = z.object({
    entityId: z.union([z.string(), z.number()]),
    notes: z.string().max(1000, 'Notes must be 1000 characters or less').optional(),
    position: z.number().int().nonnegative().optional(),
});

/**
 * Zod schema for updating a list item
 */
export const updateItemSchema = z.object({
    position: z.number().int().nonnegative().optional(),
    notes: z.string().max(1000).optional(),
});

/**
 * Zod schema for sharing a list
 */
export const shareListSchema = z.object({
    email: z.string().email('Invalid email address'),
    permission: sharePermissionSchema.default('view'),
    message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
});

/**
 * Zod schema for batch adding items
 */
export const batchAddItemsSchema = z.object({
    items: z
        .array(
            z.object({
                entityId: z.union([z.string(), z.number()]),
                notes: z.string().max(1000).optional(),
                position: z.number().int().nonnegative().optional(),
            })
        )
        .min(1, 'At least one item required')
        .max(100, 'Cannot add more than 100 items at once'),
});

/**
 * Zod schema for batch removing items
 */
export const batchRemoveItemsSchema = z
    .object({
        itemIds: z.array(z.string()).optional(),
        entityIds: z.array(z.union([z.string(), z.number()])).optional(),
    })
    .refine(
        (data: { itemIds?: string[]; entityIds?: (string | number)[] }) =>
            data.itemIds || data.entityIds,
        { message: 'Either itemIds or entityIds must be provided' }
    );

/**
 * Zod schema for moving items between lists
 */
export const moveItemsSchema = z.object({
    sourceListId: z.string().uuid('Invalid source list ID'),
    targetListId: z.string().uuid('Invalid target list ID'),
    itemIds: z.array(z.string().uuid()).min(1, 'At least one item ID required').max(100),
});

/**
 * Zod schema for duplicating a list
 */
export const duplicateListSchema = z.object({
    newName: z.string().min(1).max(100).optional(),
    includeItems: z.boolean().default(true),
});

/**
 * Zod schema for list query parameters
 */
export const listsQuerySchema = z.object({
    search: z.string().optional(),
    type: listTypeSchema.optional(),
    isPublic: z.boolean().optional(),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'itemCount']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    cursor: z.string().optional(),
    createdAfter: z.string().datetime().optional(),
    createdBefore: z.string().datetime().optional(),
    updatedAfter: z.string().datetime().optional(),
    updatedBefore: z.string().datetime().optional(),
});

/**
 * Zod schema for items query parameters
 */
export const itemsQuerySchema = z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(50),
    cursor: z.string().optional(),
    search: z.string().optional(),
});

/**
 * Zod schema for checking entity in lists
 */
export const checkEntitySchema = z.object({
    entityId: z.union([z.string(), z.number()]),
});

/**
 * Zod schema for updating member permission
 */
export const updateMemberPermissionSchema = z.object({
    userId: z.string(),
    permission: sharePermissionSchema,
});

/**
 * Zod schema for accepting/rejecting invite
 */
export const inviteActionSchema = z.object({
    token: z.string().min(1, 'Token is required'),
});
