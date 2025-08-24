import { db } from '../db';
import { alertsTable } from '../db/schema';
import { type CreateAlertInput, type Alert } from '../schema';

export const createAlert = async (input: CreateAlertInput): Promise<Alert> => {
  try {
    // Insert alert record
    const result = await db.insert(alertsTable)
      .values({
        flight_search_id: input.flight_search_id,
        alert_type: input.alert_type,
        old_price: input.old_price || null,
        new_price: input.new_price,
        currency: input.currency,
        message: input.message,
        is_read: false, // New alerts are unread by default
      })
      .returning()
      .execute();

    const alert = result[0];
    return alert;
  } catch (error) {
    console.error('Alert creation failed:', error);
    throw error;
  }
};