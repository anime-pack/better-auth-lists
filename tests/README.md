# Testing Guide

This directory contains the test suite for the Better-Auth Lists plugin using Vitest.

## Running Tests

```bash
# Run all tests once
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with UI
bun run test:ui

# Run tests with coverage
bun run test:coverage
```

## Test Structure

### `tests/unit/`

Unit tests for individual components:

- **`plugin.test.ts`** - Server-side plugin configuration, schema, and endpoints
- **`client.test.ts`** - Client-side plugin actions and methods
- **`errors.test.ts`** - Error classes and error handling

## Test Coverage

Current test coverage includes:

### ✅ Plugin Configuration
- Default and custom options
- Generic entity types (number, string, UUID)
- Sharing enable/disable
- Schema definition
- Endpoint registration
- Hooks registration

### ✅ Client Actions
- Lists management (CRUD operations)
- Items operations (add, remove, toggle, update)
- Bulk operations (batch add/remove, move, duplicate)
- Import/Export functionality
- Sharing operations (invite, accept, revoke)
- Query parameter handling
- Error handling

### ✅ Error Classes
- All error types (ListNotFoundError, ItemAlreadyExistsError, etc.)
- Error codes uniqueness
- Error inheritance and serialization
- Error details and messages

## Writing Tests

### Test Pattern

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
    beforeEach(() => {
        // Setup before each test
    });

    it('should do something', () => {
        // Arrange
        const input = 'test';

        // Act
        const result = someFunction(input);

        // Assert
        expect(result).toBe('expected');
    });
});
```

### Mocking

```typescript
// Mock functions
const mockFn = vi.fn();
mockFn.mockResolvedValue({ data: 'result' });

// Mock Better-Auth fetch
const mockFetch = vi.fn();
const actions = client.getActions(mockFetch as any);

mockFetch.mockResolvedValue({
    data: { success: true },
    error: null,
});
```

## Known Limitations

### Schema Testing
- Schema structure varies by adapter, so we only test that schemas are defined
- Field-level validation is not tested as it's adapter-specific

### Endpoint Testing
- We test that endpoints are registered but don't test their runtime behavior
- Integration tests would be needed for full endpoint validation

### Client Testing
- Tests use mocked fetch responses
- Actual Better-Auth integration requires integration tests

## Future Improvements

- [ ] Integration tests with actual Better-Auth instance
- [ ] E2E tests with real database
- [ ] Snapshot testing for schema definitions
- [ ] Property-based testing for validation logic
- [ ] Performance benchmarks
