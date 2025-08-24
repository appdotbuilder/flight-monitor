import { db } from '../db';
import { flightSearchesTable } from '../db/schema';
import { type FlightSearch } from '../schema';
import { and, eq, gte } from 'drizzle-orm';

export async function getActiveFlightSearches(): Promise<FlightSearch[]> {
  try {
    const now = new Date();
    
    const results = await db.select()
      .from(flightSearchesTable)
      .where(and(
        eq(flightSearchesTable.is_active, true),
        gte(flightSearchesTable.departure_date, now)
      ))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch active flight searches:', error);
    throw error;
  }
}