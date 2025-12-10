import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listsClient } from '../../src/client';

describe('Lists Plugin - Client Side', () => {
    let mockFetch: ReturnType<typeof vi.fn>;
    let client: ReturnType<typeof listsClient>;

    beforeEach(() => {
        mockFetch = vi.fn();
        client = listsClient<number>();
    });

    describe('Client Configuration', () => {
        it('should create client plugin with correct id', () => {
            expect(client.id).toBe('lists');
        });

        it('should define path methods for GET/POST endpoints', () => {
            expect(client.pathMethods).toBeDefined();
            expect(client.pathMethods['/lists']).toBe('GET');
            expect(client.pathMethods['/lists/:id']).toBe('GET');
            expect(client.pathMethods['/lists/check-entity']).toBe('POST');
            expect(client.pathMethods['/lists/:id/items/toggle']).toBe('POST');
        });

        it('should have getActions method', () => {
            expect(client.getActions).toBeDefined();
            expect(typeof client.getActions).toBe('function');
        });
    });

    describe('Lists Actions', () => {
        let actions: ReturnType<typeof client.getActions>;

        beforeEach(() => {
            actions = client.getActions(mockFetch as any);
        });

        it('should create getUserLists action', () => {
            expect(actions.lists.getUserLists).toBeDefined();
            expect(typeof actions.lists.getUserLists).toBe('function');
        });

        it('should create getList action', () => {
            expect(actions.lists.getList).toBeDefined();
            expect(typeof actions.lists.getList).toBe('function');
        });

        it('should create list CRUD actions', () => {
            expect(actions.lists.create).toBeDefined();
            expect(actions.lists.update).toBeDefined();
            expect(actions.lists.delete).toBeDefined();
        });

        it('should create isInAnyList action', () => {
            expect(actions.lists.isInAnyList).toBeDefined();
            expect(typeof actions.lists.isInAnyList).toBe('function');
        });

        describe('getUserLists', () => {
            it('should call fetch with correct URL', async () => {
                mockFetch.mockResolvedValue({
                    data: { data: [], meta: { total: 0 } },
                    error: null,
                });

                await actions.lists.getUserLists();

                expect(mockFetch).toHaveBeenCalledWith('/lists');
            });

            it('should append query parameters', async () => {
                mockFetch.mockResolvedValue({
                    data: { data: [], meta: { total: 0 } },
                    error: null,
                });

                await actions.lists.getUserLists({ page: 1, limit: 10, type: 'custom' });

                const callArg = mockFetch.mock.calls[0][0];
                expect(callArg).toContain('/lists?');
                expect(callArg).toContain('page=1');
                expect(callArg).toContain('limit=10');
            });

            it('should handle errors', async () => {
                const error = new Error('Fetch failed');
                mockFetch.mockResolvedValue({ data: null, error });

                await expect(actions.lists.getUserLists()).rejects.toThrow();
            });
        });

        describe('delete', () => {
            it('should use POST method with empty body', async () => {
                mockFetch.mockResolvedValue({
                    data: { success: true },
                    error: null,
                });

                await actions.lists.delete('list-123');

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-123/remove', {
                    method: 'POST',
                    body: {}, // Empty body required for POST
                });
            });
        });
    });

    describe('Items Actions', () => {
        let actions: ReturnType<typeof client.getActions>;

        beforeEach(() => {
            actions = client.getActions(mockFetch as any);
        });

        it('should create item CRUD actions', () => {
            expect(actions.items.add).toBeDefined();
            expect(actions.items.getItems).toBeDefined();
            expect(actions.items.update).toBeDefined();
            expect(actions.items.remove).toBeDefined();
        });

        it('should create toggle action', () => {
            expect(actions.items.toggle).toBeDefined();
            expect(typeof actions.items.toggle).toBe('function');
        });

        describe('toggle', () => {
            it('should call POST with entityId and notes', async () => {
                mockFetch.mockResolvedValue({
                    data: { added: true, item: { id: '1', entityId: 123 } },
                    error: null,
                });

                await actions.items.toggle('list-1', 123, 'Test note');

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/items/toggle', {
                    method: 'POST',
                    body: { entityId: 123, notes: 'Test note' },
                });
            });

            it('should work without notes', async () => {
                mockFetch.mockResolvedValue({
                    data: { added: false },
                    error: null,
                });

                await actions.items.toggle('list-1', 456);

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/items/toggle', {
                    method: 'POST',
                    body: { entityId: 456, notes: undefined },
                });
            });
        });

        describe('remove', () => {
            it('should use POST /remove with itemId in body', async () => {
                mockFetch.mockResolvedValue({
                    data: { success: true },
                    error: null,
                });

                await actions.items.remove('list-1', 'item-123');

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/items/remove', {
                    method: 'POST',
                    body: { itemId: 'item-123' },
                });
            });
        });
    });

    describe('Bulk Actions', () => {
        let actions: ReturnType<typeof client.getActions>;

        beforeEach(() => {
            actions = client.getActions(mockFetch as any);
        });

        it('should create bulk operation actions', () => {
            expect(actions.bulk.addItems).toBeDefined();
            expect(actions.bulk.removeItems).toBeDefined();
            expect(actions.bulk.moveItems).toBeDefined();
            expect(actions.bulk.duplicate).toBeDefined();
            expect(actions.bulk.import).toBeDefined();
            expect(actions.bulk.export).toBeDefined();
        });

        describe('addItems', () => {
            it('should batch add items', async () => {
                mockFetch.mockResolvedValue({
                    data: {
                        data: {
                            success: [],
                            failed: [],
                            successCount: 3,
                            failedCount: 0,
                        },
                    },
                    error: null,
                });

                await actions.bulk.addItems('list-1', {
                    items: [
                        { entityId: 1 },
                        { entityId: 2 },
                        { entityId: 3 },
                    ],
                });

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/items/batch', {
                    method: 'POST',
                    body: {
                        items: [{ entityId: 1 }, { entityId: 2 }, { entityId: 3 }],
                    },
                });
            });
        });

        describe('removeItems', () => {
            it('should use POST /batch/remove', async () => {
                mockFetch.mockResolvedValue({
                    data: {
                        data: {
                            success: [],
                            failed: [],
                            successCount: 2,
                            failedCount: 0,
                        },
                    },
                    error: null,
                });

                await actions.bulk.removeItems('list-1', {
                    entityIds: [1, 2, 3],
                });

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/items/batch/remove', {
                    method: 'POST',
                    body: { entityIds: [1, 2, 3] },
                });
            });
        });

        describe('duplicate', () => {
            it('should duplicate with options', async () => {
                mockFetch.mockResolvedValue({
                    data: { data: { id: 'new-list', name: 'Copy of List' } },
                    error: null,
                });

                await actions.bulk.duplicate('list-1', {
                    newName: 'Copy of List',
                    includeItems: true,
                });

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/duplicate', {
                    method: 'POST',
                    body: { newName: 'Copy of List', includeItems: true },
                });
            });

            it('should use empty body when no options', async () => {
                mockFetch.mockResolvedValue({
                    data: { data: { id: 'new-list' } },
                    error: null,
                });

                await actions.bulk.duplicate('list-1');

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/duplicate', {
                    method: 'POST',
                    body: {},
                });
            });
        });
    });

    describe('Sharing Actions', () => {
        let actions: ReturnType<typeof client.getActions>;

        beforeEach(() => {
            actions = client.getActions(mockFetch as any);
        });

        it('should create sharing actions', () => {
            expect(actions.sharing.invite).toBeDefined();
            expect(actions.sharing.getInvites).toBeDefined();
            expect(actions.sharing.acceptInvite).toBeDefined();
            expect(actions.sharing.rejectInvite).toBeDefined();
            expect(actions.sharing.getMembers).toBeDefined();
            expect(actions.sharing.updatePermission).toBeDefined();
            expect(actions.sharing.revoke).toBeDefined();
        });

        describe('revoke', () => {
            it('should use POST /revoke with userId in body', async () => {
                mockFetch.mockResolvedValue({
                    data: { success: true },
                    error: null,
                });

                await actions.sharing.revoke('list-1', 'user-123');

                expect(mockFetch).toHaveBeenCalledWith('/lists/list-1/members/revoke', {
                    method: 'POST',
                    body: { userId: 'user-123' },
                });
            });
        });
    });

    describe('Type Safety', () => {
        it('should support generic entity types', () => {
            const numberClient = listsClient<number>();
            const stringClient = listsClient<string>();
            const uuidClient = listsClient<string>();

            expect(numberClient.id).toBe('lists');
            expect(stringClient.id).toBe('lists');
            expect(uuidClient.id).toBe('lists');
        });
    });
});
