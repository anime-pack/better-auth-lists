# Contributing to @anime-pack/better-auth-lists

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/better-auth-lists.git
   cd better-auth-lists
   ```

3. **Install dependencies**
   ```bash
   bun install
   ```

4. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Building

```bash
bun run build
```

This compiles TypeScript and generates distribution files in `dist/`.

### Type Checking

```bash
bun run typecheck
```

### Development Mode

```bash
bun run dev
```

Watches for file changes and rebuilds automatically.

## Project Structure

```
src/
├── index.ts              # Main plugin export
├── client.ts             # Client plugin
├── types.ts              # TypeScript type definitions
├── schema.ts             # Database schema
├── errors.ts             # Error classes
├── validation.ts         # Zod validation schemas
└── endpoints/
    ├── lists.ts          # List CRUD endpoints
    ├── items.ts          # Item management endpoints
    ├── bulk.ts           # Bulk operations endpoints
    └── sharing.ts        # Sharing/collaboration endpoints
```

## Code Standards

### TypeScript

- Use strict TypeScript settings
- Prefer explicit types over `any`
- Use generics for entity types (`TEntity`)
- Document public APIs with JSDoc comments

### Naming Conventions

- **Files:** kebab-case (`list-items.ts`)
- **Functions:** camelCase (`getUserLists`)
- **Types/Interfaces:** PascalCase (`ListWithItems`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_ITEMS`)

### Error Handling

- Use custom error classes from `errors.ts`
- Include error codes from `ListErrorCode` enum
- Provide detailed error messages
- Include field names for validation errors

```typescript
// Good
throw new ItemAlreadyExistsError(entityId);

// Bad
throw new Error('Item exists');
```

## Testing (TODO)

Currently, the project doesn't have tests. Contributions adding test infrastructure are highly welcome!

When tests are added:
- Use Vitest for unit/integration tests
- Mock Better-Auth context for testing
- Test edge cases (limits, concurrent operations)
- Include type tests with `tsd`

## Pull Request Process

1. **Update documentation** - Ensure README reflects your changes
2. **Add JSDoc comments** - Document new public APIs
3. **Update CHANGELOG** (if exists) - Describe your changes
4. **Write descriptive commits**
   - Use conventional commits format
   - Examples:
     - `feat: add bulk delete operation`
     - `fix: handle empty lists in export`
     - `docs: update sharing examples`

5. **Create PR**
   - Link related issues
   - Describe what changed and why
   - Include usage examples if adding features

## Priority Areas for Contribution

### High Priority

1. **Better-Auth v1.4.5+ Compatibility** - Fix type errors and API calls
2. **Test Suite** - Add comprehensive tests
3. **Documentation** - Improve examples and guides
4. **Performance** - Optimize queries and add caching

### Medium Priority

1. **OpenAPI Spec Generation** - Auto-generate API docs
2. **Import Adapters** - Build adapters for MAL, Trakt, etc.
3. **Rate Limiting** - Implement granular rate limits
4. **Webhooks/Events** - Add event emission system

### Lower Priority

1. **Multi-Tenancy** - Support organization-scoped lists
2. **Soft Delete** - Optional soft delete feature
3. **Offline Support Docs** - PWA patterns and examples

## Questions?

- Open a [Discussion](https://github.com/anime-pack/better-auth-lists/discussions)
- Join our community (link TBD)
- Check [Issues](https://github.com/anime-pack/better-auth-lists/issues) for existing questions

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the project
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
