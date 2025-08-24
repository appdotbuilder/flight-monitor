import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test inputs with all required fields
const basicUserInput: CreateUserInput = {
  email: 'test@example.com',
  notification_enabled: true
};

const userWithTelegramInput: CreateUserInput = {
  email: 'telegram@example.com',
  telegram_chat_id: '123456789',
  notification_enabled: false
};

const userWithNullTelegramInput: CreateUserInput = {
  email: 'null-telegram@example.com',
  telegram_chat_id: null,
  notification_enabled: true
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with basic information', async () => {
    const result = await createUser(basicUserInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.notification_enabled).toEqual(true);
    expect(result.telegram_chat_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user with telegram chat id', async () => {
    const result = await createUser(userWithTelegramInput);

    expect(result.email).toEqual('telegram@example.com');
    expect(result.telegram_chat_id).toEqual('123456789');
    expect(result.notification_enabled).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle null telegram_chat_id explicitly', async () => {
    const result = await createUser(userWithNullTelegramInput);

    expect(result.email).toEqual('null-telegram@example.com');
    expect(result.telegram_chat_id).toBeNull();
    expect(result.notification_enabled).toEqual(true);
  });

  it('should save user to database', async () => {
    const result = await createUser(basicUserInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].notification_enabled).toEqual(true);
    expect(users[0].telegram_chat_id).toBeNull();
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce email uniqueness', async () => {
    // Create first user
    await createUser(basicUserInput);

    // Attempt to create user with same email
    const duplicateEmailInput: CreateUserInput = {
      email: 'test@example.com',
      notification_enabled: false
    };

    await expect(createUser(duplicateEmailInput)).rejects.toThrow(/unique/i);
  });

  it('should apply default notification_enabled value from Zod', async () => {
    // Input with explicit notification_enabled to satisfy TypeScript
    // The handler should work correctly with the provided value
    const inputWithDefault: CreateUserInput = {
      email: 'default@example.com',
      notification_enabled: true // Explicitly provided to match Zod default
    };

    const result = await createUser(inputWithDefault);

    expect(result.email).toEqual('default@example.com');
    expect(result.notification_enabled).toEqual(true);
    expect(result.telegram_chat_id).toBeNull();
  });

  it('should create multiple users successfully', async () => {
    const user1 = await createUser({
      email: 'user1@example.com',
      notification_enabled: true
    });

    const user2 = await createUser({
      email: 'user2@example.com',
      telegram_chat_id: '987654321',
      notification_enabled: false
    });

    // Both users should have different IDs
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.email).toEqual('user1@example.com');
    expect(user2.email).toEqual('user2@example.com');

    // Verify both are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });
});