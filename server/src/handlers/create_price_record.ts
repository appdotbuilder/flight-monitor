import { db } from '../db';
import { priceRecordsTable, flightSearchesTable } from '../db/schema';
import { type CreatePriceRecordInput, type PriceRecord } from '../schema';
import { eq } from 'drizzle-orm';

export async function createPriceRecord(input: CreatePriceRecordInput): Promise<PriceRecord> {
  try {
    // Validate that the flight search exists and is active
    const flightSearch = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, input.flight_search_id))
      .execute();

    if (flightSearch.length === 0) {
      throw new Error(`Flight search with id ${input.flight_search_id} not found`);
    }

    if (!flightSearch[0].is_active) {
      throw new Error(`Flight search with id ${input.flight_search_id} is not active`);
    }

    // Insert the price record
    const result = await db.insert(priceRecordsTable)
      .values({
        flight_search_id: input.flight_search_id,
        price: input.price, // Integer column - no conversion needed
        currency: input.currency,
        provider: input.provider
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Price record creation failed:', error);
    throw error;
  }
}