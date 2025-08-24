import { db } from '../db';
import { flightSearchesTable } from '../db/schema';
import { type GetFlightSearchesByUserInput, type FlightSearch } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getFlightSearchesByUser(input: GetFlightSearchesByUserInput): Promise<FlightSearch[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id (required field)
    conditions.push(eq(flightSearchesTable.user_id, input.user_id));
    
    // Add optional active status filter
    if (input.is_active !== undefined) {
      conditions.push(eq(flightSearchesTable.is_active, input.is_active));
    }
    
    // Build and execute query with proper typing
    const results = await db.select()
      .from(flightSearchesTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();
    
    // Return results (no numeric conversion needed - all fields are proper types)
    return results;
  } catch (error) {
    console.error('Failed to get flight searches by user:', error);
    throw error;
  }
}