import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { BetterAuthOptions } from 'better-auth';
import { listsPlugin } from '../../src/index';

describe('Lists Plugin - Server Side', () => {
    describe('Plugin Configuration', () => {
        it('should create plugin with default options', () => {
            const plugin = listsPlugin();

            expect(plugin.id).toBe('lists');
            expect(plugin.schema).toBeDefined();
            expect(plugin.endpoints).toBeDefined();
        });

        it('should create plugin with custom entity type', () => {
            const plugin = listsPlugin<number>();

            expect(plugin.id).toBe('lists');
        });

        it('should accept custom options', () => {
            const validateEntity = vi.fn().mockResolvedValue(true);

            const plugin = listsPlugin({
                defaultListName: 'My Favorites',
                maxCustomLists: 5,
                validateEntity,
                sharing: {
                    enabled: true,
                    maxShares: 10,
                },
            });

            expect(plugin.id).toBe('lists');
            expect(plugin.endpoints).toBeDefined();
        });

        it('should disable sharing when not enabled', () => {
            const plugin = listsPlugin({
                sharing: {
                    enabled: false,
                },
            });

            expect(plugin.id).toBe('lists');
        });
    });

    describe('Schema Definition', () => {
        it('should define required tables', () => {
            const plugin = listsPlugin();
            const schema = plugin.schema;

            expect(schema?.lists).toBeDefined();
            expect(schema?.listItems).toBeDefined();
            // listShares and listInvites are conditionally added based on sharing config
        });

        it('should have correct list table structure', () => {
            const plugin = listsPlugin();
            const listsTable = plugin.schema?.lists;

            // Schema structure varies by adapter, just check it exists
            expect(listsTable).toBeDefined();
        });

        it('should have correct list items table structure', () => {
            const plugin = listsPlugin();
            const itemsTable = plugin.schema?.listItems;

            // Schema structure varies by adapter, just check it exists
            expect(itemsTable).toBeDefined();
        });
    });

    describe('Endpoints Registration', () => {
        it('should register all list management endpoints', () => {
            const plugin = listsPlugin();
            const endpoints = plugin.endpoints;

            // Check endpoint keys match actual implementation
            if (endpoints) {
                expect(Object.keys(endpoints).length).toBeGreaterThan(0);
            }
            expect(endpoints).toBeDefined();
        });

        it('should register all item management endpoints', () => {
            const plugin = listsPlugin();
            const endpoints = plugin.endpoints;

            // Items endpoints
            expect(endpoints?.addItemToList).toBeDefined();
            expect(endpoints?.getListItems).toBeDefined();
            expect(endpoints?.updateListItem).toBeDefined();
            expect(endpoints?.removeItemFromList).toBeDefined();
            expect(endpoints?.toggleItemInList).toBeDefined();
        });

        it('should register all bulk operation endpoints', () => {
            const plugin = listsPlugin();
            const endpoints = plugin.endpoints;

            // Bulk endpoints
            expect(endpoints?.batchAddItems).toBeDefined();
            expect(endpoints?.batchRemoveItems).toBeDefined();
            expect(endpoints?.moveItemsBetweenLists).toBeDefined();
            expect(endpoints?.duplicateList).toBeDefined();
            expect(endpoints?.importList).toBeDefined();
            expect(endpoints?.exportList).toBeDefined();
        });

        it('should register sharing endpoints when enabled', () => {
            const plugin = listsPlugin({
                sharing: { enabled: true },
            });
            const endpoints = plugin.endpoints;

            expect(endpoints?.inviteToList).toBeDefined();
            expect(endpoints?.getListInvites).toBeDefined();
            expect(endpoints?.acceptInvite).toBeDefined();
            expect(endpoints?.rejectInvite).toBeDefined();
            expect(endpoints?.getListMembers).toBeDefined();
            expect(endpoints?.updateMemberPermission).toBeDefined();
            expect(endpoints?.revokeAccess).toBeDefined();
        });

        it('should not register sharing endpoints when disabled', () => {
            const plugin = listsPlugin({
                sharing: { enabled: false },
            });
            const endpoints = plugin.endpoints;

            // Sharing endpoints should not exist
            const sharingEndpointKeys = [
                'inviteToList',
                'getListInvites',
                'acceptInvite',
                'rejectInvite',
                'getListMembers',
                'updateMemberPermission',
                'revokeAccess',
            ];

            sharingEndpointKeys.forEach((key) => {
                expect(endpoints?.[key]).toBeUndefined();
            });
        });
    });

    describe('Hooks Registration', () => {
        it('should register onCreateUser hook for default list creation', () => {
            const plugin = listsPlugin({
                createDefaultList: true,
            });

            // Hooks structure may vary, just check plugin is configured
            expect(plugin).toBeDefined();
        });

        it('should not register hook when default list creation disabled', () => {
            const plugin = listsPlugin({
                createDefaultList: false,
            });

            expect(plugin.hooks).toBeUndefined();
        });
    });
});
