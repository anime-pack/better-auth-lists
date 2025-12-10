import { describe, it, expect } from 'vitest';
import {
    ListNotFoundError,
    ItemNotFoundError,
    ItemAlreadyExistsError,
    ListFullError,
    ListLimitReachedError,
    EntityValidationFailedError,
    CannotDeleteDefaultError,
    PermissionDeniedError,
    InvalidInviteError,
    InviteExpiredError,
    ShareLimitReachedError,
} from '../../src/errors';
import { ListErrorCode } from '../../src/types';

describe('Error Classes', () => {
    describe('ListNotFoundError', () => {
        it('should create error with listId', () => {
            const error = new ListNotFoundError('list-123');

            expect(error.message).toContain('not found');
            expect(error.code).toBe(ListErrorCode.LIST_NOT_FOUND);
            expect(error.name).toBe('ListNotFoundError');
            expect(error.details?.listId).toBe('list-123');
        });
    });

    describe('ItemNotFoundError', () => {
        it('should create error with itemId', () => {
            const error = new ItemNotFoundError('item-456');

            expect(error.message).toContain('not found');
            expect(error.code).toBe(ListErrorCode.ITEM_NOT_FOUND);
            expect(error.details?.itemId).toBe('item-456');
        });
    });

    describe('ItemAlreadyExistsError', () => {
        it('should create error with entityId', () => {
            const error = new ItemAlreadyExistsError(123);

            expect(error.message).toContain('already exists');
            expect(error.code).toBe(ListErrorCode.ITEM_ALREADY_EXISTS);
            expect(error.details?.entityId).toBe(123);
        });

        it('should work with string entityId', () => {
            const error = new ItemAlreadyExistsError('anime-456');

            expect(error.details?.entityId).toBe('anime-456');
        });
    });

    describe('ListFullError', () => {
        it('should create error with capacity info', () => {
            const error = new ListFullError(100);

            expect(error.message).toContain('full');
            expect(error.code).toBe(ListErrorCode.LIST_FULL);
            expect(error.details?.maxItems).toBe(100);
        });
    });

    describe('ListLimitReachedError', () => {
        it('should create error with max lists info', () => {
            const error = new ListLimitReachedError(10);

            expect(error.message).toContain('10');
            expect(error.code).toBe(ListErrorCode.LIST_LIMIT_REACHED);
            expect(error.details?.maxLists).toBe(10);
        });
    });

    describe('EntityValidationFailedError', () => {
        it('should create error with entityId', () => {
            const error = new EntityValidationFailedError(789);

            expect(error.message).toContain('validation');
            expect(error.code).toBe(ListErrorCode.ENTITY_VALIDATION_FAILED);
            expect(error.details?.entityId).toBe(789);
        });
    });

    describe('CannotDeleteDefaultError', () => {
        it('should create error for default list deletion', () => {
            const error = new CannotDeleteDefaultError();

            expect(error.message).toContain('default');
            expect(error.code).toBe(ListErrorCode.CANNOT_DELETE_DEFAULT);
        });
    });

    describe('PermissionDeniedError', () => {
        it('should create error with custom message', () => {
            const error = new PermissionDeniedError('Cannot edit this list');

            expect(error.message).toContain('Cannot edit this list');
            expect(error.code).toBe(ListErrorCode.PERMISSION_DENIED);
        });

        it('should use default message', () => {
            const error = new PermissionDeniedError();

            expect(error.message).toContain('Permission denied');
            expect(error.code).toBe(ListErrorCode.PERMISSION_DENIED);
        });
    });

    describe('InvalidInviteError', () => {
        it('should create error with custom message', () => {
            const error = new InvalidInviteError('Token expired');

            expect(error.message).toContain('Token expired');
            expect(error.code).toBe(ListErrorCode.INVALID_INVITE);
        });
    });

    describe('InviteExpiredError', () => {
        it('should create error for expired invite', () => {
            const error = new InviteExpiredError();

            expect(error.message).toContain('expired');
            expect(error.code).toBe(ListErrorCode.INVITE_EXPIRED);
        });
    });

    describe('ShareLimitReachedError', () => {
        it('should create error with max shares info', () => {
            const error = new ShareLimitReachedError(50);

            expect(error.message).toContain('50');
            expect(error.code).toBe(ListErrorCode.SHARE_LIMIT_REACHED);
            expect(error.details?.maxShares).toBe(50);
        });
    });

    describe('Error Codes', () => {
        it('should have unique error codes', () => {
            const codes = Object.values(ListErrorCode);
            const uniqueCodes = new Set(codes);

            expect(uniqueCodes.size).toBe(codes.length);
        });

        it('should have all error codes defined', () => {
            expect(ListErrorCode.LIST_NOT_FOUND).toBeDefined();
            expect(ListErrorCode.ITEM_NOT_FOUND).toBeDefined();
            expect(ListErrorCode.ITEM_ALREADY_EXISTS).toBeDefined();
            expect(ListErrorCode.LIST_FULL).toBeDefined();
            expect(ListErrorCode.LIST_LIMIT_REACHED).toBeDefined();
            expect(ListErrorCode.ENTITY_VALIDATION_FAILED).toBeDefined();
            expect(ListErrorCode.CANNOT_DELETE_DEFAULT).toBeDefined();
            expect(ListErrorCode.PERMISSION_DENIED).toBeDefined();
            expect(ListErrorCode.INVALID_INVITE).toBeDefined();
            expect(ListErrorCode.INVITE_EXPIRED).toBeDefined();
            expect(ListErrorCode.SHARE_LIMIT_REACHED).toBeDefined();
        });
    });

    describe('Error Inheritance', () => {
        it('should extend Error class', () => {
            const error = new ListNotFoundError('test');

            expect(error).toBeInstanceOf(Error);
        });

        it('should have correct prototype chain', () => {
            const error = new ListNotFoundError('test');

            expect(error.constructor.name).toBe('ListNotFoundError');
        });

        it('should have toJSON method', () => {
            const error = new ListNotFoundError('list-123');
            const json = error.toJSON();

            expect(json).toHaveProperty('error');
            expect(json).toHaveProperty('code');
            expect(json.code).toBe(ListErrorCode.LIST_NOT_FOUND);
        });
    });
});
