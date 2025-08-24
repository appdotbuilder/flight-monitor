import { db } from '../db';
import { priceRecordsTable } from '../db/schema';
import { type GetPriceHistoryInput, type PriceRecord } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getPriceHistory = async (input: GetPriceHistoryInput): Promise<PriceRecord[]> => {
  try {
    // Build the query step by step
    const baseQuery = db.select()
      .from(priceRecordsTable)
      .where(eq(priceRecordsTable.flight_search_id, input.flight_search_id))
      .orderBy(desc(priceRecordsTable.recorded_at));

    // Execute with or without limit
    const results = input.limit !== undefined 
      ? await baseQuery.limit(input.limit).execute()
      : await baseQuery.execute();

    // Convert price from cents to dollars for the API response
    return results.map(record => ({
      ...record,
      price: record.price / 100 // Convert cents to dollars
    }));
  } catch (error) {
    console.error('Failed to get price history:', error);
    throw error;
  }
};