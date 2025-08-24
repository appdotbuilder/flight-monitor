import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable, priceRecordsTable } from '../db/schema';
import { type GetPriceHistoryInput } from '../schema';
import { getPriceHistory } from '../handlers/get_price_history';

describe('getPriceHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return price history for a flight search', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'New York',
        destination_city: 'Los Angeles',
        departure_date: new Date('2024-06-15'),
        return_date: new Date('2024-06-22'),
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create price records with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(priceRecordsTable)
      .values([
        {
          flight_search_id: flightSearchId,
          price: 35000, // $350.00 in cents
          currency: 'USD',
          provider: 'TestProvider',
          recorded_at: twoHoursAgo
        },
        {
          flight_search_id: flightSearchId,
          price: 32500, // $325.00 in cents
          currency: 'USD',
          provider: 'TestProvider',
          recorded_at: oneHourAgo
        },
        {
          flight_search_id: flightSearchId,
          price: 30000, // $300.00 in cents
          currency: 'USD',
          provider: 'TestProvider',
          recorded_at: now
        }
      ])
      .execute();

    const input: GetPriceHistoryInput = {
      flight_search_id: flightSearchId
    };

    const result = await getPriceHistory(input);

    // Should return 3 records ordered by recorded_at desc
    expect(result).toHaveLength(3);
    
    // Verify ordering (most recent first)
    expect(result[0].price).toEqual(300); // Most recent
    expect(result[1].price).toEqual(325); // One hour ago
    expect(result[2].price).toEqual(350); // Two hours ago
    
    // Verify all fields are present and correctly formatted
    expect(result[0]).toMatchObject({
      flight_search_id: flightSearchId,
      price: 300,
      currency: 'USD',
      provider: 'TestProvider'
    });
    
    // Verify timestamps are in correct order
    expect(result[0].recorded_at >= result[1].recorded_at).toBe(true);
    expect(result[1].recorded_at >= result[2].recorded_at).toBe(true);
    
    // Verify price conversion from cents to dollars
    expect(typeof result[0].price).toBe('number');
    expect(result[0].price).toEqual(300);
  });

  it('should return empty array for non-existent flight search', async () => {
    const input: GetPriceHistoryInput = {
      flight_search_id: 999999
    };

    const result = await getPriceHistory(input);

    expect(result).toHaveLength(0);
  });

  it('should respect limit parameter', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Boston',
        destination_city: 'Miami',
        departure_date: new Date('2024-07-10'),
        return_date: null, // One-way flight
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create multiple price records
    const baseTime = new Date();
    const priceRecords = [];
    for (let i = 0; i < 5; i++) {
      priceRecords.push({
        flight_search_id: flightSearchId,
        price: (400 + i * 50) * 100, // $400, $450, $500, etc. in cents
        currency: 'USD',
        provider: 'TestProvider',
        recorded_at: new Date(baseTime.getTime() - i * 60 * 60 * 1000) // Each record 1 hour apart
      });
    }

    await db.insert(priceRecordsTable)
      .values(priceRecords)
      .execute();

    const input: GetPriceHistoryInput = {
      flight_search_id: flightSearchId,
      limit: 2
    };

    const result = await getPriceHistory(input);

    // Should return only 2 records (the most recent ones)
    expect(result).toHaveLength(2);
    expect(result[0].price).toEqual(400); // Most recent
    expect(result[1].price).toEqual(450); // Second most recent
  });

  it('should handle flight searches with no price records', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test flight search but no price records
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Chicago',
        destination_city: 'Seattle',
        departure_date: new Date('2024-08-01'),
        return_date: new Date('2024-08-08'),
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    const input: GetPriceHistoryInput = {
      flight_search_id: flightSearchId
    };

    const result = await getPriceHistory(input);

    expect(result).toHaveLength(0);
  });

  it('should correctly convert prices from cents to dollars', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Denver',
        destination_city: 'Phoenix',
        departure_date: new Date('2024-09-15'),
        return_date: null,
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create price record with specific cent amount
    await db.insert(priceRecordsTable)
      .values({
        flight_search_id: flightSearchId,
        price: 45678, // $456.78 in cents
        currency: 'USD',
        provider: 'TestProvider'
      })
      .execute();

    const input: GetPriceHistoryInput = {
      flight_search_id: flightSearchId
    };

    const result = await getPriceHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].price).toEqual(456.78);
    expect(typeof result[0].price).toBe('number');
  });

  it('should handle different currencies', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'London',
        destination_city: 'Paris',
        departure_date: new Date('2024-10-01'),
        return_date: new Date('2024-10-03'),
        is_active: true
      })
      .returning()
      .execute();
    const flightSearchId = flightSearchResult[0].id;

    // Create price records with different currencies
    await db.insert(priceRecordsTable)
      .values([
        {
          flight_search_id: flightSearchId,
          price: 25000, // €250.00 in cents
          currency: 'EUR',
          provider: 'TestProvider'
        },
        {
          flight_search_id: flightSearchId,
          price: 22000, // £220.00 in cents
          currency: 'GBP',
          provider: 'TestProvider'
        }
      ])
      .execute();

    const input: GetPriceHistoryInput = {
      flight_search_id: flightSearchId
    };

    const result = await getPriceHistory(input);

    expect(result).toHaveLength(2);
    
    // Find EUR record
    const eurRecord = result.find(r => r.currency === 'EUR');
    expect(eurRecord).toBeDefined();
    expect(eurRecord!.price).toEqual(250);
    
    // Find GBP record
    const gbpRecord = result.find(r => r.currency === 'GBP');
    expect(gbpRecord).toBeDefined();
    expect(gbpRecord!.price).toEqual(220);
  });
});