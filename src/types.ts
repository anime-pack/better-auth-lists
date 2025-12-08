import type { z } from 'zod';

/**
 * Permission levels for shared lists
 */
export type SharePermission = 'view' | 'edit' | 'admin';

/**
 * List type - default (favorites) or custom user-created lists
 */
export type ListType = 'default' | 'custom';

/**
 * Invite status
 */
export type InviteStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/**
 * Core list entity
 */
export interface List {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: ListType;
  isPublic: boolean;
  maxItems: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List item entity - generic over entity ID type
 */
export interface ListItem<TEntity = string | number> {
  id: string;
  listId: string;
  entityId: TEntity;
  position: number;
  notes?: string;
  addedAt: Date;
}

/**
 * List share entity - for collaborative lists
 */
export interface ListShare {
  id: string;
  listId: string;
  sharedWithUserId: string;
  permission: SharePermission;
  sharedAt: Date;
}

/**
 * List invite entity - for pending invitations
 */
export interface ListInvite {
  id: string;
  listId: string;
  inviterUserId: string;
  inviteeEmail: string;
  permission: SharePermission;
  token: string;
  status: InviteStatus;
  message?: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * List with items and metadata
 */
export interface ListWithItems<TEntity = string | number> extends List {
  items: ListItem<TEntity>[];
  itemCount: number;
}

/**
 * List with members (for shared lists)
 */
export interface ListWithMembers extends List {
  members: Array<{
    userId: string;
    permission: SharePermission;
    sharedAt: Date;
  }>;
}

/**
 * Input type for creating a new list
 */
export interface CreateListInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  maxItems?: number;
}

/**
 * Input type for updating a list
 */
export interface UpdateListInput {
  name?: string;
  description?: string;
  isPublic?: boolean;
  maxItems?: number;
}

/**
 * Input type for adding an item to a list
 */
export interface AddItemToListInput<TEntity = string | number> {
  entityId: TEntity;
  notes?: string;
  position?: number;
}

/**
 * Input type for updating a list item
 */
export interface UpdateListItemInput {
  position?: number;
  notes?: string;
}

/**
 * Input type for sharing a list
 */
export interface ShareListInput {
  email: string;
  permission: SharePermission;
  message?: string;
}

/**
 * Input type for batch adding items
 */
export interface BatchAddItemsInput<TEntity = string | number> {
  items: Array<{
    entityId: TEntity;
    notes?: string;
    position?: number;
  }>;
}

/**
 * Input type for batch removing items
 */
export interface BatchRemoveItemsInput<TEntity = string | number> {
  itemIds?: string[];
  entityIds?: TEntity[];
}

/**
 * Input type for moving items between lists
 */
export interface MoveItemsInput {
  sourceListId: string;
  targetListId: string;
  itemIds: string[];
}

/**
 * Input type for duplicating a list
 */
export interface DuplicateListInput {
  newName?: string;
  includeItems?: boolean;
}

/**
 * Export format for list data
 */
export interface ListExportFormat<TEntity = string | number> {
  version: string;
  exportedAt: string;
  list: {
    name: string;
    description?: string;
    type: ListType;
    isPublic: boolean;
    maxItems: number;
  };
  items: Array<{
    entityId: TEntity;
    position: number;
    notes?: string;
    addedAt: string;
  }>;
  metadata: {
    itemCount: number;
    exportedBy: string;
  };
}

/**
 * Result of a batch operation
 */
export interface BatchOperationResult<T = any> {
  success: T[];
  failed: Array<{
    item: any;
    error: string;
  }>;
  successCount: number;
  failedCount: number;
}

/**
 * Query parameters for filtering lists
 */
export interface ListsQueryParams {
  search?: string;
  type?: ListType;
  isPublic?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'itemCount';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

/**
 * Paginated response metadata
 */
export interface PaginationMeta {
  total: number;
  page?: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Paginated list response
 */
export interface PaginatedListsResponse<TEntity = string | number> {
  data: ListWithItems<TEntity>[];
  meta: PaginationMeta;
}

/**
 * Configuration options for the lists plugin
 */
export interface ListsPluginOptions<TEntity = string | number> {
  /**
   * Maximum number of custom lists a user can create (excluding default favorites list)
   * @default 10
   */
  maxCustomLists?: number;

  /**
   * Maximum number of items allowed per list
   * @default 100
   */
  maxItemsPerList?: number;

  /**
   * Name for the default favorites list created on user signup
   * @default "Favorites"
   */
  defaultListName?: string;

  /**
   * Description for the default favorites list
   * @default "Your favorite items"
   */
  defaultListDescription?: string;

  /**
   * Automatically create a default list for new users on signup
   * When enabled, also creates default list for existing users on first query if they have none
   * @default true
   */
  createDefaultList?: boolean;

  /**
   * Optional validation function to verify entity exists before adding to list
   * Useful for validating against external APIs (e.g., MAL API for anime)
   * @param entityId - The entity ID to validate
   * @returns Promise<boolean> - true if entity is valid, false otherwise
   */
  validateEntity?: (entityId: TEntity) => Promise<boolean>;

  /**
   * Enable sharing and collaboration features
   */
  sharing?: {
    /**
     * Enable/disable sharing features
     * @default false
     */
    enabled: boolean;

    /**
     * Maximum number of users a list can be shared with
     * @default 50
     */
    maxShares?: number;

    /**
     * Invite expiration time in hours
     * @default 168 (7 days)
     */
    inviteExpirationHours?: number;

    /**
     * Allow public lists to be discoverable
     * @default true
     */
    enablePublicDiscovery?: boolean;
  };

  /**
   * Schema customization options
   * Allows extending the default schema with custom fields
   */
  schema?: {
    lists?: Record<string, any>;
    listItems?: Record<string, any>;
    listShares?: Record<string, any>;
    listInvites?: Record<string, any>;
  };
}

/**
 * Error codes for the lists plugin
 */
export enum ListErrorCode {
  LIST_NOT_FOUND = 'LIST_NOT_FOUND',
  LIST_LIMIT_REACHED = 'LIST_LIMIT_REACHED',
  LIST_FULL = 'LIST_FULL',
  ITEM_NOT_FOUND = 'ITEM_NOT_FOUND',
  ITEM_ALREADY_EXISTS = 'ITEM_ALREADY_EXISTS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_INVITE = 'INVALID_INVITE',
  INVITE_EXPIRED = 'INVITE_EXPIRED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CANNOT_DELETE_DEFAULT = 'CANNOT_DELETE_DEFAULT',
  ENTITY_VALIDATION_FAILED = 'ENTITY_VALIDATION_FAILED',
  SHARE_LIMIT_REACHED = 'SHARE_LIMIT_REACHED',
}

/**
 * Structured error response
 */
export interface ListError {
  error: string;
  code: ListErrorCode;
  field?: string;
  details?: Record<string, any>;
}

/**
 * Type guard for checking if an error is a ListError
 */
export function isListError(error: any): error is ListError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    Object.values(ListErrorCode).includes(error.code)
  );
}
