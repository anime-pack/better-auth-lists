import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';
import type {
  ListsPluginOptions,
  List,
  ListShare,
  ListInvite,
  SharePermission,
} from '../types';
import {
  ListNotFoundError,
  PermissionDeniedError,
  InvalidInviteError,
  InviteExpiredError,
  ShareLimitReachedError,
} from '../errors';
import {
  shareListSchema,
  updateMemberPermissionSchema,
  inviteActionSchema,
} from '../validation';
import { z } from 'zod';

/**
 * Create sharing and collaboration endpoints (conditional on feature flag)
 */
export const createSharingEndpoints = <TEntity = string | number>(
  options: ListsPluginOptions<TEntity>
) => {
  if (!options.sharing?.enabled) {
    return {};
  }

  const maxShares = options.sharing.maxShares ?? 50;
  const inviteExpirationHours = options.sharing.inviteExpirationHours ?? 168;

  return {
    /**
     * POST /api/auth/lists/:id/invite - Invite user to list
     */
    inviteToList: createAuthEndpoint(
      '/lists/:id/invite',
      {
        method: 'POST',
        body: shareListSchema,
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Invite user to list',
            description: 'Send an invitation to share a list with another user',
            tags: ['Sharing'],
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
        const { email, permission, message } = ctx.body;

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

        // Check share limit
        const existingShares = await ctx.context.adapter.findMany<ListShare>({
          model: 'listShares',
          where: [{ field: 'listId', value: listId }],
        });

        if (existingShares.length >= maxShares) {
          throw new ShareLimitReachedError(maxShares);
        }

        // Check if user is trying to invite themselves
        const userByEmail = await ctx.context.adapter.findOne<{ id: string; email: string }>({
          model: 'user',
          where: [{ field: 'email', value: email }],
        });

        if (userByEmail?.id === userId) {
          throw new InvalidInviteError('Cannot invite yourself');
        }

        // Check if already shared with this user
        if (userByEmail) {
          const existingShare = await ctx.context.adapter.findOne({
            model: 'listShares',
            where: [
              { field: 'listId', value: listId },
              { field: 'sharedWithUserId', value: userByEmail.id },
            ],
          });

          if (existingShare) {
            throw new InvalidInviteError('List already shared with this user');
          }
        }

        // Check if there's already a pending invite
        const existingInvite = await ctx.context.adapter.findOne<ListInvite>({
          model: 'listInvites',
          where: [
            { field: 'listId', value: listId },
            { field: 'inviteeEmail', value: email },
            { field: 'status', value: 'pending' },
          ],
        });

        if (existingInvite) {
          throw new InvalidInviteError('Invite already pending for this email');
        }

        // Generate secure token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + inviteExpirationHours);

        // Create invite
        const invite = await ctx.context.adapter.create<ListInvite>({
          model: 'listInvites',
          data: {
            listId,
            inviterUserId: userId,
            inviteeEmail: email,
            permission,
            token,
            status: 'pending',
            message,
            expiresAt,
            createdAt: new Date(),
          } as any,
        });

        // TODO: Send email notification via Better-Auth notification hooks

        return ctx.json({ data: invite }, { status: 201 });
      }
    ),

    /**
     * GET /api/auth/lists/:id/invites - Get list invites
     */
    getListInvites: createAuthEndpoint(
      '/lists/:id/invites',
      {
        method: 'GET',
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Get list invites',
            description: 'Get all pending invites for a list',
            tags: ['Sharing'],
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

        // Verify list ownership
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

        // Get invites
        const invites = await ctx.context.adapter.findMany<ListInvite>({
          model: 'listInvites',
          where: [{ field: 'listId', value: listId }],
          sortBy: { field: 'createdAt', direction: 'desc' },
        });

        return ctx.json({ data: invites });
      }
    ),

    /**
     * POST /api/auth/invites/accept - Accept list invite
     */
    acceptInvite: createAuthEndpoint(
      '/invites/accept',
      {
        method: 'POST',
        body: inviteActionSchema,
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Accept invite',
            description: 'Accept a list sharing invitation',
            tags: ['Sharing'],
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
        const { token } = ctx.body;

        // Get invite
        const invite = await ctx.context.adapter.findOne<ListInvite>({
          model: 'listInvites',
          where: [{ field: 'token', value: token }],
        });

        if (!invite) {
          throw new InvalidInviteError('Invalid token');
        }

        // Check if expired
        if (new Date() > invite.expiresAt) {
          // Update status
          await ctx.context.adapter.update({
            model: 'listInvites',
            where: [{ field: 'id', value: invite.id }],
            update: { status: 'expired' },
          });
          throw new InviteExpiredError();
        }

        // Check status
        if (invite.status !== 'pending') {
          throw new InvalidInviteError(`Invite is ${invite.status}`);
        }

        // Verify email matches user
        const user = await ctx.context.adapter.findOne<{ id: string; email: string }>({
          model: 'user',
          where: [{ field: 'id', value: userId }],
        });

        if (!user || user.email !== invite.inviteeEmail) {
          throw new PermissionDeniedError('Email does not match invite');
        }

        // Create share
        const share = await ctx.context.adapter.create<ListShare>({
          model: 'listShares',
          data: {
            listId: invite.listId,
            sharedWithUserId: userId,
            permission: invite.permission,
            sharedAt: new Date(),
          } as any,
        });

        // Update invite status
        await ctx.context.adapter.update({
          model: 'listInvites',
          where: [{ field: 'id', value: invite.id }],
          update: { status: 'accepted' },
        });

        return ctx.json({ data: share });
      }
    ),

    /**
     * POST /api/auth/invites/reject - Reject list invite
     */
    rejectInvite: createAuthEndpoint(
      '/invites/reject',
      {
        method: 'POST',
        body: inviteActionSchema,
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Reject invite',
            description: 'Reject a list sharing invitation',
            tags: ['Sharing'],
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
        const { token } = ctx.body;

        // Get invite
        const invite = await ctx.context.adapter.findOne<ListInvite>({
          model: 'listInvites',
          where: [{ field: 'token', value: token }],
        });

        if (!invite) {
          throw new InvalidInviteError('Invalid token');
        }

        // Verify email matches user
        const user = await ctx.context.adapter.findOne<{ id: string; email: string }>({
          model: 'user',
          where: [{ field: 'id', value: userId }],
        });

        if (!user || user.email !== invite.inviteeEmail) {
          throw new PermissionDeniedError('Email does not match invite');
        }

        // Update invite status
        await ctx.context.adapter.update({
          model: 'listInvites',
          where: [{ field: 'id', value: invite.id }],
          update: { status: 'rejected' },
        });

        return ctx.json({ success: true });
      }
    ),

    /**
     * GET /api/auth/lists/:id/members - Get list members
     */
    getListMembers: createAuthEndpoint(
      '/lists/:id/members',
      {
        method: 'GET',
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Get list members',
            description: 'Get all users who have access to a list',
            tags: ['Sharing'],
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

        // Verify list access (owner or shared with)
        const list = await ctx.context.adapter.findOne<List>({
          model: 'lists',
          where: [{ field: 'id', value: listId }],
        });

        if (!list) {
          throw new ListNotFoundError(listId);
        }

        const isOwner = list.userId === userId;
        if (!isOwner) {
          const share = await ctx.context.adapter.findOne<ListShare>({
            model: 'listShares',
            where: [
              { field: 'listId', value: listId },
              { field: 'sharedWithUserId', value: userId },
            ],
          });

          if (!share) {
            throw new PermissionDeniedError();
          }
        }

        // Get all shares
        const shares = await ctx.context.adapter.findMany<ListShare>({
          model: 'listShares',
          where: [{ field: 'listId', value: listId }],
        });

        // Get user details for each share
        const members = await Promise.all(
          shares.map(async (share) => {
            const user = await ctx.context.adapter.findOne<{ id: string; email: string; name: string }>({
              model: 'user',
              where: [{ field: 'id', value: share.sharedWithUserId }],
            });

            return {
              userId: share.sharedWithUserId,
              email: user?.email,
              name: user?.name,
              permission: share.permission,
              sharedAt: share.sharedAt,
            };
          })
        );

        // Include owner
        const owner = await ctx.context.adapter.findOne<{ id: string; email: string; name: string }>({
          model: 'user',
          where: [{ field: 'id', value: list.userId }],
        });

        return ctx.json({
          data: {
            owner: {
              userId: list.userId,
              email: owner?.email,
              name: owner?.name,
              permission: 'admin' as SharePermission,
            },
            members,
          },
        });
      }
    ),

    /**
     * PATCH /api/auth/lists/:id/members/:userId - Update member permission
     */
    updateMemberPermission: createAuthEndpoint(
      '/lists/:id/members/:userId',
      {
        method: 'PATCH',
        body: z.object({ permission: z.enum(['view', 'edit', 'admin']) }),
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Update member permission',
            description: 'Update the permission level of a list member',
            tags: ['Sharing'],
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
        const ownerId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const memberId = ctx.params.userId;
        const { permission } = ctx.body;

        // Verify list ownership
        const list = await ctx.context.adapter.findOne<List>({
          model: 'lists',
          where: [
            { field: 'id', value: listId },
            { field: 'userId', value: ownerId },
          ],
        });

        if (!list) {
          throw new PermissionDeniedError('Only list owner can update permissions');
        }

        // Get share
        const share = await ctx.context.adapter.findOne<ListShare>({
          model: 'listShares',
          where: [
            { field: 'listId', value: listId },
            { field: 'sharedWithUserId', value: memberId },
          ],
        });

        if (!share) {
          throw new InvalidInviteError('User is not a member of this list');
        }

        // Update permission
        const updated = await ctx.context.adapter.update<ListShare>({
          model: 'listShares',
          where: [{ field: 'id', value: share.id }],
          update: { permission },
        });

        return ctx.json({ data: updated });
      }
    ),

    /**
     * DELETE /api/auth/lists/:id/members/:userId - Revoke access
     */
    revokeAccess: createAuthEndpoint(
      '/lists/:id/members/:userId',
      {
        method: 'DELETE',
        use: [sessionMiddleware],
        metadata: {
          openapi: {
            summary: 'Revoke access',
            description: 'Remove a user from a shared list',
            tags: ['Sharing'],
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
        const ownerId = ctx.context.session.user.id;
        const listId = ctx.params.id;
        const memberId = ctx.params.userId;

        // Verify list ownership
        const list = await ctx.context.adapter.findOne<List>({
          model: 'lists',
          where: [
            { field: 'id', value: listId },
            { field: 'userId', value: ownerId },
          ],
        });

        if (!list) {
          throw new PermissionDeniedError('Only list owner can revoke access');
        }

        // Get share
        const share = await ctx.context.adapter.findOne<ListShare>({
          model: 'listShares',
          where: [
            { field: 'listId', value: listId },
            { field: 'sharedWithUserId', value: memberId },
          ],
        });

        if (!share) {
          throw new InvalidInviteError('User is not a member of this list');
        }

        // Delete share
        await ctx.context.adapter.delete({
          model: 'listShares',
          where: [{ field: 'id', value: share.id }],
        });

        return ctx.json({ success: true });
      }
    ),
  };
};
