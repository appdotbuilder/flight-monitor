import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable, alertsTable } from '../db/schema';
import { type GetAlertsInput } from '../schema';
import { getAlerts } from '../handlers/get_alerts';

describe('getAlerts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup
  let testUserId: number;
  let otherUserId: number;
  let testFlightSearchId: number;
  let otherFlightSearchId: number;

  const setupTestData = async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          notification_enabled: true
        },
        {
          email: 'other@example.com',
          notification_enabled: true
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create flight searches
    const flightSearches = await db.insert(flightSearchesTable)
      .values([
        {
          user_id: testUserId,
          origin_city: 'New York',
          destination_city: 'London',
          departure_date: new Date('2024-06-01'),
          return_date: new Date('2024-06-10'),
          is_active: true
        },
        {
          user_id: otherUserId,
          origin_city: 'Paris',
          destination_city: 'Tokyo',
          departure_date: new Date('2024-07-01'),
          return_date: null,
          is_active: true
        }
      ])
      .returning()
      .execute();

    testFlightSearchId = flightSearches[0].id;
    otherFlightSearchId = flightSearches[1].id;

    // Create test alerts
    await db.insert(alertsTable)
      .values([
        {
          flight_search_id: testFlightSearchId,
          alert_type: 'price_drop',
          old_price: 50000, // $500.00
          new_price: 45000, // $450.00
          currency: 'USD',
          message: 'Price dropped by $50',
          is_read: false
        },
        {
          flight_search_id: testFlightSearchId,
          alert_type: 'price_increase',
          old_price: 45000,
          new_price: 48000, // $480.00
          currency: 'USD',
          message: 'Price increased by $30',
          is_read: true
        },
        {
          flight_search_id: otherFlightSearchId,
          alert_type: 'price_target_reached',
          old_price: null,
          new_price: 30000, // $300.00
          currency: 'USD',
          message: 'Target price reached',
          is_read: false
        }
      ])
      .execute();
  };

  it('should return all alerts when no filters applied', async () => {
    await setupTestData();

    const input: GetAlertsInput = {};
    const result = await getAlerts(input);

    expect(result).toHaveLength(3);
    expect(result[0].created_at).toBeInstanceOf(Date);
    
    // Should be ordered by created_at desc (newest first)
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should filter alerts by user_id', async () => {
    await setupTestData();

    const input: GetAlertsInput = {
      user_id: testUserId
    };
    const result = await getAlerts(input);

    expect(result).toHaveLength(2);
    result.forEach(alert => {
      expect(alert.flight_search_id).toEqual(testFlightSearchId);
    });

    // Test other user
    const otherInput: GetAlertsInput = {
      user_id: otherUserId
    };
    const otherResult = await getAlerts(otherInput);

    expect(otherResult).toHaveLength(1);
    expect(otherResult[0].flight_search_id).toEqual(otherFlightSearchId);
    expect(otherResult[0].alert_type).toEqual('price_target_reached');
  });

  it('should filter alerts by flight_search_id', async () => {
    await setupTestData();

    const input: GetAlertsInput = {
      flight_search_id: testFlightSearchId
    };
    const result = await getAlerts(input);

    expect(result).toHaveLength(2);
    result.forEach(alert => {
      expect(alert.flight_search_id).toEqual(testFlightSearchId);
    });

    // Verify alert details
    expect(result.some(alert => alert.alert_type === 'price_drop')).toBe(true);
    expect(result.some(alert => alert.alert_type === 'price_increase')).toBe(true);
  });

  it('should filter alerts by read status', async () => {
    await setupTestData();

    // Test unread alerts
    const unreadInput: GetAlertsInput = {
      is_read: false
    };
    const unreadResult = await getAlerts(unreadInput);

    expect(unreadResult).toHaveLength(2);
    unreadResult.forEach(alert => {
      expect(alert.is_read).toBe(false);
    });

    // Test read alerts
    const readInput: GetAlertsInput = {
      is_read: true
    };
    const readResult = await getAlerts(readInput);

    expect(readResult).toHaveLength(1);
    expect(readResult[0].is_read).toBe(true);
    expect(readResult[0].alert_type).toEqual('price_increase');
  });

  it('should combine multiple filters', async () => {
    await setupTestData();

    // Filter by user_id and is_read
    const input: GetAlertsInput = {
      user_id: testUserId,
      is_read: false
    };
    const result = await getAlerts(input);

    expect(result).toHaveLength(1);
    expect(result[0].flight_search_id).toEqual(testFlightSearchId);
    expect(result[0].is_read).toBe(false);
    expect(result[0].alert_type).toEqual('price_drop');
    expect(result[0].old_price).toEqual(50000);
    expect(result[0].new_price).toEqual(45000);
  });

  it('should return empty array when no alerts match filters', async () => {
    await setupTestData();

    // Filter by non-existent user
    const input: GetAlertsInput = {
      user_id: 99999
    };
    const result = await getAlerts(input);

    expect(result).toHaveLength(0);
  });

  it('should handle alerts with null old_price', async () => {
    await setupTestData();

    const input: GetAlertsInput = {
      flight_search_id: otherFlightSearchId
    };
    const result = await getAlerts(input);

    expect(result).toHaveLength(1);
    expect(result[0].old_price).toBe(null);
    expect(result[0].new_price).toEqual(30000);
    expect(result[0].alert_type).toEqual('price_target_reached');
  });

  it('should maintain correct field types', async () => {
    await setupTestData();

    const input: GetAlertsInput = {
      user_id: testUserId
    };
    const result = await getAlerts(input);

    expect(result.length).toBeGreaterThan(0);
    
    const alert = result[0];
    expect(typeof alert.id).toBe('number');
    expect(typeof alert.flight_search_id).toBe('number');
    expect(typeof alert.new_price).toBe('number');
    expect(typeof alert.is_read).toBe('boolean');
    expect(alert.created_at).toBeInstanceOf(Date);
    expect(typeof alert.message).toBe('string');
    expect(typeof alert.currency).toBe('string');
    
    // old_price can be number or null
    if (alert.old_price !== null) {
      expect(typeof alert.old_price).toBe('number');
    }
  });
});