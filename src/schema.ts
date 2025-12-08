import type { ListsPluginOptions } from './types';

/**
 * Better-Auth plugin schema definition for lists tables
 */
export const createListsSchema = <TEntity = string | number>(
  options?: ListsPluginOptions<TEntity>
) => {
  const baseSchema = {
    lists: {
      modelName: 'list',
      fields: {
        userId: {
          type: 'string' as const,
          required: true,
          references: {
            model: 'user',
            field: 'id',
            onDelete: 'cascade' as const,
          },
          index: true,
        },
        name: {
          type: 'string' as const,
          required: true,
        },
        description: {
          type: 'string' as const,
          required: false,
        },
        type: {
          type: 'string' as const,
          required: true,
          defaultValue: 'custom',
        },
        isPublic: {
          type: 'boolean' as const,
          required: true,
          defaultValue: false,
        },
        maxItems: {
          type: 'number' as const,
          required: true,
          defaultValue: options?.maxItemsPerList ?? 100,
        },
        createdAt: {
          type: 'date' as const,
          required: true,
          defaultValue: () => new Date(),
        },
        updatedAt: {
          type: 'date' as const,
          required: true,
          defaultValue: () => new Date(),
        },
      },
    },
    listItems: {
      modelName: 'listItem',
      fields: {
        listId: {
          type: 'string' as const,
          required: true,
          references: {
            model: 'lists',
            field: 'id',
            onDelete: 'cascade' as const,
          },
          index: true,
        },
        entityId: {
          type: 'string' as const,
          required: true,
          index: true,
        },
        position: {
          type: 'number' as const,
          required: true,
          defaultValue: 0,
        },
        notes: {
          type: 'string' as const,
          required: false,
        },
        addedAt: {
          type: 'date' as const,
          required: true,
          defaultValue: () => new Date(),
        },
      },
    },
  };

  // Add sharing tables if enabled
  if (options?.sharing?.enabled) {
    return {
      ...baseSchema,
      listShares: {
        modelName: 'listShare',
        fields: {
          listId: {
            type: 'string' as const,
            required: true,
            references: {
              model: 'lists',
              field: 'id',
              onDelete: 'cascade' as const,
            },
            index: true,
          },
          sharedWithUserId: {
            type: 'string' as const,
            required: true,
            references: {
              model: 'user',
              field: 'id',
              onDelete: 'cascade' as const,
            },
            index: true,
          },
          permission: {
            type: 'string' as const,
            required: true,
            defaultValue: 'view',
          },
          sharedAt: {
            type: 'date' as const,
            required: true,
            defaultValue: () => new Date(),
          },
        },
      },
      listInvites: {
        modelName: 'listInvite',
        fields: {
          listId: {
            type: 'string' as const,
            required: true,
            references: {
              model: 'lists',
              field: 'id',
              onDelete: 'cascade' as const,
            },
            index: true,
          },
          inviterUserId: {
            type: 'string' as const,
            required: true,
            references: {
              model: 'user',
              field: 'id',
              onDelete: 'cascade' as const,
            },
          },
          inviteeEmail: {
            type: 'string' as const,
            required: true,
          },
          permission: {
            type: 'string' as const,
            required: true,
            defaultValue: 'view',
          },
          token: {
            type: 'string' as const,
            required: true,
            unique: true,
          },
          status: {
            type: 'string' as const,
            required: true,
            defaultValue: 'pending',
          },
          message: {
            type: 'string' as const,
            required: false,
          },
          expiresAt: {
            type: 'date' as const,
            required: true,
          },
          createdAt: {
            type: 'date' as const,
            required: true,
            defaultValue: () => new Date(),
          },
        },
      },
    };
  }

  return baseSchema;
};

/**
 * Merge user-provided schema customizations with base schema
 */
export const mergeSchema = <TEntity = string | number>(
  baseSchema: ReturnType<typeof createListsSchema<TEntity>>,
  customSchema?: ListsPluginOptions<TEntity>['schema']
) => {
  if (!customSchema) return baseSchema;

  const merged = { ...baseSchema };

  // Merge custom fields for each model
  if (customSchema.lists) {
    merged.lists = {
      ...merged.lists,
      fields: {
        ...merged.lists.fields,
        ...customSchema.lists,
      },
    };
  }

  if (customSchema.listItems) {
    merged.listItems = {
      ...merged.listItems,
      fields: {
        ...merged.listItems.fields,
        ...customSchema.listItems,
      },
    };
  }

  if ('listShares' in merged && customSchema.listShares) {
    merged.listShares = {
      ...merged.listShares,
      fields: {
        ...merged.listShares.fields,
        ...customSchema.listShares,
      },
    };
  }

  if ('listInvites' in merged && customSchema.listInvites) {
    merged.listInvites = {
      ...merged.listInvites,
      fields: {
        ...merged.listInvites.fields,
        ...customSchema.listInvites,
      },
    };
  }

  return merged;
};
