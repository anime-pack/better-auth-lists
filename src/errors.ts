import { ListErrorCode, type ListError } from './types';

/**
 * Base error class for lists plugin
 */
export class ListsPluginError extends Error {
  constructor(
    public code: ListErrorCode,
    message: string,
    public field?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ListsPluginError';
  }

  toJSON(): ListError {
    return {
      error: this.message,
      code: this.code,
      field: this.field,
      details: this.details,
    };
  }
}

/**
 * Error thrown when a list is not found
 */
export class ListNotFoundError extends ListsPluginError {
  constructor(listId?: string) {
    super(
      ListErrorCode.LIST_NOT_FOUND,
      'List not found',
      undefined,
      listId ? { listId } : undefined
    );
    this.name = 'ListNotFoundError';
  }
}

/**
 * Error thrown when user has reached maximum number of lists
 */
export class ListLimitReachedError extends ListsPluginError {
  constructor(maxLists: number) {
    super(
      ListErrorCode.LIST_LIMIT_REACHED,
      `Maximum ${maxLists} custom lists allowed`,
      undefined,
      { maxLists }
    );
    this.name = 'ListLimitReachedError';
  }
}

/**
 * Error thrown when a list is at maximum capacity
 */
export class ListFullError extends ListsPluginError {
  constructor(maxItems: number) {
    super(
      ListErrorCode.LIST_FULL,
      `List is full (max ${maxItems} items)`,
      undefined,
      { maxItems }
    );
    this.name = 'ListFullError';
  }
}

/**
 * Error thrown when a list item is not found
 */
export class ItemNotFoundError extends ListsPluginError {
  constructor(itemId?: string) {
    super(
      ListErrorCode.ITEM_NOT_FOUND,
      'Item not found in list',
      undefined,
      itemId ? { itemId } : undefined
    );
    this.name = 'ItemNotFoundError';
  }
}

/**
 * Error thrown when trying to add an item that already exists in the list
 */
export class ItemAlreadyExistsError extends ListsPluginError {
  constructor(entityId: string | number) {
    super(
      ListErrorCode.ITEM_ALREADY_EXISTS,
      'Item already exists in list',
      'entityId',
      { entityId }
    );
    this.name = 'ItemAlreadyExistsError';
  }
}

/**
 * Error thrown when user doesn't have permission to perform an action
 */
export class PermissionDeniedError extends ListsPluginError {
  constructor(action?: string) {
    super(
      ListErrorCode.PERMISSION_DENIED,
      action ? `Permission denied: ${action}` : 'Permission denied',
      undefined,
      action ? { action } : undefined
    );
    this.name = 'PermissionDeniedError';
  }
}

/**
 * Error thrown when an invite is invalid
 */
export class InvalidInviteError extends ListsPluginError {
  constructor(reason?: string) {
    super(
      ListErrorCode.INVALID_INVITE,
      reason ? `Invalid invite: ${reason}` : 'Invalid invite',
      undefined,
      reason ? { reason } : undefined
    );
    this.name = 'InvalidInviteError';
  }
}

/**
 * Error thrown when an invite has expired
 */
export class InviteExpiredError extends ListsPluginError {
  constructor() {
    super(ListErrorCode.INVITE_EXPIRED, 'Invite has expired');
    this.name = 'InviteExpiredError';
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends ListsPluginError {
  constructor(message: string, field?: string, details?: Record<string, any>) {
    super(ListErrorCode.VALIDATION_FAILED, message, field, details);
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when trying to delete the default favorites list
 */
export class CannotDeleteDefaultError extends ListsPluginError {
  constructor() {
    super(
      ListErrorCode.CANNOT_DELETE_DEFAULT,
      'Cannot delete default favorites list'
    );
    this.name = 'CannotDeleteDefaultError';
  }
}

/**
 * Error thrown when entity validation fails
 */
export class EntityValidationFailedError extends ListsPluginError {
  constructor(entityId: string | number) {
    super(
      ListErrorCode.ENTITY_VALIDATION_FAILED,
      'Entity validation failed',
      'entityId',
      { entityId }
    );
    this.name = 'EntityValidationFailedError';
  }
}

/**
 * Error thrown when share limit is reached
 */
export class ShareLimitReachedError extends ListsPluginError {
  constructor(maxShares: number) {
    super(
      ListErrorCode.SHARE_LIMIT_REACHED,
      `Maximum ${maxShares} shares allowed per list`,
      undefined,
      { maxShares }
    );
    this.name = 'ShareLimitReachedError';
  }
}

/**
 * Helper function to create a standardized error response
 */
export function createListError(
  code: ListErrorCode,
  message: string,
  field?: string,
  details?: Record<string, any>
): ListError {
  return {
    error: message,
    code,
    field,
    details,
  };
}

/**
 * Convert Zod validation errors to ListError format
 */
export function fromZodError(error: any): ListError {
  const issues = error.issues || [];
  const firstIssue = issues[0];

  return createListError(
    ListErrorCode.VALIDATION_FAILED,
    firstIssue?.message || 'Validation failed',
    firstIssue?.path?.join('.'),
    {
      issues: issues.map((issue: any) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }
  );
}
