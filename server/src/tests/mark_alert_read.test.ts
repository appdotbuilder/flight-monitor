import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable, alertsTable } from '../db/schema';
import { markAlertRead } from '../handlers/mark_alert_read';
import { eq } from 'drizzle-orm';

describe('markAlertRead', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark an unread alert as read', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'New York',
        destination_city: 'Los Angeles',
        departure_date: new Date('2024-06-01'),
        return_date: new Date('2024-06-10'),
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create an unread alert
    const alertResult = await db.insert(alertsTable)
      .values({
        flight_search_id: flightSearchId,
        alert_type: 'price_drop',
        old_price: 50000, // $500.00 in cents
        new_price: 45000, // $450.00 in cents
        currency: 'USD',
        message: 'Price dropped by $50!',
        is_read: false
      })
      .returning()
      .execute();
    const alertId = alertResult[0].id;

    // Mark alert as read
    const result = await markAlertRead(alertId);

    // Verify the result
    expect(result.id).toEqual(alertId);
    expect(result.flight_search_id).toEqual(flightSearchId);
    expect(result.alert_type).toEqual('price_drop');
    expect(result.old_price).toEqual(50000);
    expect(result.new_price).toEqual(45000);
    expect(result.currency).toEqual('USD');
    expect(result.message).toEqual('Price dropped by $50!');
    expect(result.is_read).toEqual(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save the read status to database', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Chicago',
        destination_city: 'Miami',
        departure_date: new Date('2024-07-15'),
        return_date: null, // One-way flight
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create an unread alert
    const alertResult = await db.insert(alertsTable)
      .values({
        flight_search_id: flightSearchId,
        alert_type: 'price_target_reached',
        old_price: null, // No previous price
        new_price: 30000, // $300.00 in cents
        currency: 'USD',
        message: 'Target price reached!',
        is_read: false
      })
      .returning()
      .execute();
    const alertId = alertResult[0].id;

    // Mark alert as read
    await markAlertRead(alertId);

    // Verify in database
    const alerts = await db.select()
      .from(alertsTable)
      .where(eq(alertsTable.id, alertId))
      .execute();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].is_read).toEqual(true);
    expect(alerts[0].flight_search_id).toEqual(flightSearchId);
    expect(alerts[0].alert_type).toEqual('price_target_reached');
    expect(alerts[0].old_price).toEqual(null);
    expect(alerts[0].new_price).toEqual(30000);
    expect(alerts[0].currency).toEqual('USD');
    expect(alerts[0].message).toEqual('Target price reached!');
  });

  it('should handle alert with null old_price', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Boston',
        destination_city: 'Seattle',
        departure_date: new Date('2024-08-20'),
        return_date: new Date('2024-08-27'),
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create alert with null old_price (first alert for this search)
    const alertResult = await db.insert(alertsTable)
      .values({
        flight_search_id: flightSearchId,
        alert_type: 'price_increase',
        old_price: null, // First alert, no previous price
        new_price: 65000, // $650.00 in cents
        currency: 'USD',
        message: 'Initial price alert',
        is_read: false
      })
      .returning()
      .execute();
    const alertId = alertResult[0].id;

    // Mark alert as read
    const result = await markAlertRead(alertId);

    // Verify null old_price is handled correctly
    expect(result.old_price).toEqual(null);
    expect(result.new_price).toEqual(65000);
    expect(result.is_read).toEqual(true);
  });

  it('should throw error when alert does not exist', async () => {
    const nonExistentId = 99999;

    await expect(markAlertRead(nonExistentId))
      .rejects
      .toThrow(/Alert with id 99999 not found/i);
  });

  it('should work with already read alert', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Dallas',
        destination_city: 'Denver',
        departure_date: new Date('2024-09-10'),
        return_date: new Date('2024-09-17'),
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create an already read alert
    const alertResult = await db.insert(alertsTable)
      .values({
        flight_search_id: flightSearchId,
        alert_type: 'price_drop',
        old_price: 40000, // $400.00 in cents
        new_price: 35000, // $350.00 in cents
        currency: 'USD',
        message: 'Price dropped significantly!',
        is_read: true // Already read
      })
      .returning()
      .execute();
    const alertId = alertResult[0].id;

    // Mark alert as read again (should still work)
    const result = await markAlertRead(alertId);

    // Verify it remains read
    expect(result.is_read).toEqual(true);
    expect(result.id).toEqual(alertId);
    expect(result.alert_type).toEqual('price_drop');
    expect(result.old_price).toEqual(40000);
    expect(result.new_price).toEqual(35000);
  });

  it('should preserve all original alert data when marking as read', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        notification_enabled: false
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'San Francisco',
        destination_city: 'Tokyo',
        departure_date: new Date('2024-12-01'),
        return_date: new Date('2024-12-15'),
        is_active: false
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create alert with specific data to verify preservation
    const originalAlert = {
      flight_search_id: flightSearchId,
      alert_type: 'price_increase' as const,
      old_price: 120000, // $1200.00 in cents
      new_price: 135000, // $1350.00 in cents
      currency: 'EUR',
      message: 'International flight price increased',
      is_read: false
    };

    const alertResult = await db.insert(alertsTable)
      .values(originalAlert)
      .returning()
      .execute();
    const alertId = alertResult[0].id;
    const originalCreatedAt = alertResult[0].created_at;

    // Mark alert as read
    const result = await markAlertRead(alertId);

    // Verify all original data is preserved except is_read
    expect(result.id).toEqual(alertId);
    expect(result.flight_search_id).toEqual(flightSearchId);
    expect(result.alert_type).toEqual('price_increase');
    expect(result.old_price).toEqual(120000);
    expect(result.new_price).toEqual(135000);
    expect(result.currency).toEqual('EUR');
    expect(result.message).toEqual('International flight price increased');
    expect(result.is_read).toEqual(true); // Only this should change
    expect(result.created_at).toEqual(originalCreatedAt); // Should be preserved
  });
});