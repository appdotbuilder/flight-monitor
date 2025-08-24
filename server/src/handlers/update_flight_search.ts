import { db } from '../db';
import { flightSearchesTable } from '../db/schema';
import { type UpdateFlightSearchInput, type FlightSearch } from '../schema';
import { eq } from 'drizzle-orm';

export const updateFlightSearch = async (input: UpdateFlightSearchInput): Promise<FlightSearch> => {
  try {
    // First, check if the flight search exists
    const existingSearch = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, input.id))
      .execute();

    if (existingSearch.length === 0) {
      throw new Error(`Flight search with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.origin_city !== undefined) {
      updateData.origin_city = input.origin_city;
    }

    if (input.destination_city !== undefined) {
      updateData.destination_city = input.destination_city;
    }

    if (input.departure_date !== undefined) {
      updateData.departure_date = input.departure_date;
    }

    if (input.return_date !== undefined) {
      updateData.return_date = input.return_date;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Perform the update
    const result = await db.update(flightSearchesTable)
      .set(updateData)
      .where(eq(flightSearchesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Flight search update failed:', error);
    throw error;
  }
};