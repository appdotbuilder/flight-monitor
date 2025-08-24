import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        telegram_chat_id: input.telegram_chat_id ?? null,
        notification_enabled: input.notification_enabled // Zod default is already applied
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};