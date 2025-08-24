import { db } from '../db';
import { alertsTable } from '../db/schema';
import { type Alert } from '../schema';
import { eq } from 'drizzle-orm';

export const markAlertRead = async (alertId: number): Promise<Alert> => {
  try {
    // Update the alert's is_read status and return the updated record
    const result = await db.update(alertsTable)
      .set({ is_read: true })
      .where(eq(alertsTable.id, alertId))
      .returning()
      .execute();

    // Check if alert was found and updated
    if (result.length === 0) {
      throw new Error(`Alert with id ${alertId} not found`);
    }

    const alert = result[0];
    
    // Return the alert with proper type conversions
    return {
      ...alert,
      // Convert integer prices back to numbers (they're stored as integers for cents)
      old_price: alert.old_price,
      new_price: alert.new_price
    };
  } catch (error) {
    console.error('Mark alert as read failed:', error);
    throw error;
  }
};