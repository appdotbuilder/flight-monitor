import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable, alertsTable } from '../db/schema';
import { type CreateAlertInput } from '../schema';
import { createAlert } from '../handlers/create_alert';
import { eq } from 'drizzle-orm';

describe('createAlert', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testFlightSearchId: number;

  beforeEach(async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true,
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create prerequisite flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: testUserId,
        origin_city: 'New York',
        destination_city: 'London',
        departure_date: new Date('2024-06-15'),
        return_date: new Date('2024-06-22'),
        is_active: true,
      })
      .returning()
      .execute();
    testFlightSearchId = flightSearchResult[0].id;
  });

  it('should create a price drop alert', async () => {
    const testInput: CreateAlertInput = {
      flight_search_id: testFlightSearchId,
      alert_type: 'price_drop',
      old_price: 50000, // $500.00 in cents
      new_price: 45000, // $450.00 in cents
      currency: 'USD',
      message: 'Great news! The price for your flight from New York to London dropped by $50.00'
    };

    const result = await createAlert(testInput);

    // Basic field validation
    expect(result.flight_search_id).toEqual(testFlightSearchId);
    expect(result.alert_type).toEqual('price_drop');
    expect(result.old_price).toEqual(50000);
    expect(result.new_price).toEqual(45000);
    expect(result.currency).toEqual('USD');
    expect(result.message).toEqual(testInput.message);
    expect(result.is_read).toEqual(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a price increase alert', async () => {
    const testInput: CreateAlertInput = {
      flight_search_id: testFlightSearchId,
      alert_type: 'price_increase',
      old_price: 45000, // $450.00 in cents
      new_price: 52000, // $520.00 in cents
      currency: 'USD',
      message: 'Price alert: Your flight from New York to London increased by $70.00'
    };

    const result = await createAlert(testInput);

    expect(result.alert_type).toEqual('price_increase');
    expect(result.old_price).toEqual(45000);
    expect(result.new_price).toEqual(52000);
    expect(result.is_read).toEqual(false);
  });

  it('should create a target reached alert with null old_price', async () => {
    const testInput: CreateAlertInput = {
      flight_search_id: testFlightSearchId,
      alert_type: 'price_target_reached',
      new_price: 40000, // $400.00 in cents
      currency: 'USD',
      message: 'Target price reached! Your flight is now available for $400.00'
    };

    const result = await createAlert(testInput);

    expect(result.alert_type).toEqual('price_target_reached');
    expect(result.old_price).toBeNull();
    expect(result.new_price).toEqual(40000);
    expect(result.currency).toEqual('USD');
  });

  it('should save alert to database', async () => {
    const testInput: CreateAlertInput = {
      flight_search_id: testFlightSearchId,
      alert_type: 'price_drop',
      old_price: 60000,
      new_price: 55000,
      currency: 'EUR',
      message: 'Price dropped for your European flight!'
    };

    const result = await createAlert(testInput);

    // Query database to verify alert was saved
    const alerts = await db.select()
      .from(alertsTable)
      .where(eq(alertsTable.id, result.id))
      .execute();

    expect(alerts).toHaveLength(1);
    expect(alerts[0].flight_search_id).toEqual(testFlightSearchId);
    expect(alerts[0].alert_type).toEqual('price_drop');
    expect(alerts[0].old_price).toEqual(60000);
    expect(alerts[0].new_price).toEqual(55000);
    expect(alerts[0].currency).toEqual('EUR');
    expect(alerts[0].message).toEqual(testInput.message);
    expect(alerts[0].is_read).toEqual(false);
    expect(alerts[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle different currencies correctly', async () => {
    const testInputs = [
      {
        flight_search_id: testFlightSearchId,
        alert_type: 'price_drop' as const,
        old_price: 45000,
        new_price: 42000,
        currency: 'GBP',
        message: 'Price dropped in GBP'
      },
      {
        flight_search_id: testFlightSearchId,
        alert_type: 'price_increase' as const,
        old_price: 38000,
        new_price: 41000,
        currency: 'JPY',
        message: 'Price increased in JPY'
      }
    ];

    for (const input of testInputs) {
      const result = await createAlert(input);
      expect(result.currency).toEqual(input.currency);
      expect(result.message).toEqual(input.message);
    }
  });

  it('should create multiple alerts for same flight search', async () => {
    const firstAlert: CreateAlertInput = {
      flight_search_id: testFlightSearchId,
      alert_type: 'price_drop',
      old_price: 50000,
      new_price: 45000,
      currency: 'USD',
      message: 'First price drop'
    };

    const secondAlert: CreateAlertInput = {
      flight_search_id: testFlightSearchId,
      alert_type: 'price_increase',
      old_price: 45000,
      new_price: 48000,
      currency: 'USD',
      message: 'Price went back up'
    };

    const result1 = await createAlert(firstAlert);
    const result2 = await createAlert(secondAlert);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.flight_search_id).toEqual(result2.flight_search_id);

    // Verify both alerts exist in database
    const allAlerts = await db.select()
      .from(alertsTable)
      .where(eq(alertsTable.flight_search_id, testFlightSearchId))
      .execute();

    expect(allAlerts).toHaveLength(2);
  });

  it('should reject alert with invalid flight_search_id', async () => {
    const testInput: CreateAlertInput = {
      flight_search_id: 99999, // Non-existent flight search
      alert_type: 'price_drop',
      old_price: 50000,
      new_price: 45000,
      currency: 'USD',
      message: 'This should fail'
    };

    expect(createAlert(testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});