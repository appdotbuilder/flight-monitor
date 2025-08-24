import { db } from '../db';
import { alertsTable, flightSearchesTable } from '../db/schema';
import { type GetAlertsInput, type Alert } from '../schema';
import { eq, desc, and, type SQL } from 'drizzle-orm';

export async function getAlerts(input: GetAlertsInput): Promise<Alert[]> {
  try {
    // Handle queries that require join separately from simple queries
    if (input.user_id !== undefined) {
      // Build conditions for joined query
      const conditions: SQL<unknown>[] = [
        eq(flightSearchesTable.user_id, input.user_id)
      ];

      // Add additional filters if present
      if (input.flight_search_id !== undefined) {
        conditions.push(eq(alertsTable.flight_search_id, input.flight_search_id));
      }

      if (input.is_read !== undefined) {
        conditions.push(eq(alertsTable.is_read, input.is_read));
      }

      // Build complete joined query in one chain
      const joinedResults = await db.select()
        .from(alertsTable)
        .innerJoin(
          flightSearchesTable,
          eq(alertsTable.flight_search_id, flightSearchesTable.id)
        )
        .where(
          conditions.length === 1 ? conditions[0] : and(...conditions)
        )
        .orderBy(desc(alertsTable.created_at))
        .execute();

      // Extract alert data from joined results
      return joinedResults.map(result => ({
        ...result.alerts,
        old_price: result.alerts.old_price,
        new_price: result.alerts.new_price
      }));
    } else {
      // Handle simple query without join
      const conditions: SQL<unknown>[] = [];

      // Add filters
      if (input.flight_search_id !== undefined) {
        conditions.push(eq(alertsTable.flight_search_id, input.flight_search_id));
      }

      if (input.is_read !== undefined) {
        conditions.push(eq(alertsTable.is_read, input.is_read));
      }

      // Build complete simple query in one chain - always include where clause
      const baseQuery = db.select().from(alertsTable);
      
      const simpleResults = conditions.length > 0
        ? await baseQuery
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(alertsTable.created_at))
            .execute()
        : await baseQuery
            .orderBy(desc(alertsTable.created_at))
            .execute();

      return simpleResults.map(result => ({
        ...result,
        old_price: result.old_price,
        new_price: result.new_price
      }));
    }
  } catch (error) {
    console.error('Get alerts failed:', error);
    throw error;
  }
}