import { db } from '../db';
import { flightSearchesTable, usersTable } from '../db/schema';
import { type CreateFlightSearchInput, type FlightSearch } from '../schema';
import { eq } from 'drizzle-orm';

export async function createFlightSearch(input: CreateFlightSearchInput): Promise<FlightSearch> {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Validate dates are in the future
    const now = new Date();
    if (input.departure_date <= now) {
      throw new Error('Departure date must be in the future');
    }

    if (input.return_date && input.return_date <= input.departure_date) {
      throw new Error('Return date must be after departure date');
    }

    // Insert flight search record
    const result = await db.insert(flightSearchesTable)
      .values({
        user_id: input.user_id,
        origin_city: input.origin_city,
        destination_city: input.destination_city,
        departure_date: input.departure_date,
        return_date: input.return_date || null,
        is_active: true // New searches are active by default
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Flight search creation failed:', error);
    throw error;
  }
}