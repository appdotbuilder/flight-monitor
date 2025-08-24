import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable } from '../db/schema';
import { getActiveFlightSearches } from '../handlers/get_active_searches';

describe('getActiveFlightSearches', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only active flight searches with future departure dates', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 7);
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - 7);

    // Create active search with future departure (should be included)
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'New York',
        destination_city: 'London',
        departure_date: futureDate,
        is_active: true
      })
      .execute();

    // Create inactive search with future departure (should be excluded)
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Paris',
        destination_city: 'Tokyo',
        departure_date: futureDate,
        is_active: false
      })
      .execute();

    // Create active search with past departure (should be excluded)
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Berlin',
        destination_city: 'Rome',
        departure_date: pastDate,
        is_active: true
      })
      .execute();

    const results = await getActiveFlightSearches();

    expect(results).toHaveLength(1);
    expect(results[0].origin_city).toBe('New York');
    expect(results[0].destination_city).toBe('London');
    expect(results[0].is_active).toBe(true);
    expect(results[0].departure_date).toBeInstanceOf(Date);
    expect(results[0].departure_date.getTime()).toBeGreaterThan(now.getTime());
  });

  it('should return empty array when no active searches with future dates exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);

    // Create only past or inactive searches
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Old York',
        destination_city: 'Old London',
        departure_date: pastDate,
        is_active: true
      })
      .execute();

    const results = await getActiveFlightSearches();

    expect(results).toHaveLength(0);
  });

  it('should handle searches with return dates correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 20);

    // Create round-trip search
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Sydney',
        destination_city: 'Melbourne',
        departure_date: futureDate,
        return_date: returnDate,
        is_active: true
      })
      .execute();

    // Create one-way search
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Brisbane',
        destination_city: 'Perth',
        departure_date: futureDate,
        return_date: null,
        is_active: true
      })
      .execute();

    const results = await getActiveFlightSearches();

    expect(results).toHaveLength(2);
    
    const roundTripSearch = results.find(r => r.origin_city === 'Sydney');
    expect(roundTripSearch?.return_date).toBeInstanceOf(Date);
    expect(roundTripSearch?.return_date?.getTime()).toBe(returnDate.getTime());
    
    const oneWaySearch = results.find(r => r.origin_city === 'Brisbane');
    expect(oneWaySearch?.return_date).toBeNull();
  });

  it('should return searches from multiple users', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    // Create searches for both users
    await db.insert(flightSearchesTable)
      .values({
        user_id: user1Id,
        origin_city: 'User1 Origin',
        destination_city: 'User1 Destination',
        departure_date: futureDate,
        is_active: true
      })
      .execute();

    await db.insert(flightSearchesTable)
      .values({
        user_id: user2Id,
        origin_city: 'User2 Origin',
        destination_city: 'User2 Destination',
        departure_date: futureDate,
        is_active: true
      })
      .execute();

    const results = await getActiveFlightSearches();

    expect(results).toHaveLength(2);
    
    const userIds = results.map(r => r.user_id).sort();
    expect(userIds).toEqual([user1Id, user2Id].sort());
    
    expect(results.some(r => r.origin_city === 'User1 Origin')).toBe(true);
    expect(results.some(r => r.origin_city === 'User2 Origin')).toBe(true);
  });

  it('should include all required fields in returned flight searches', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Test Origin',
        destination_city: 'Test Destination',
        departure_date: futureDate,
        is_active: true
      })
      .execute();

    const results = await getActiveFlightSearches();

    expect(results).toHaveLength(1);
    const search = results[0];

    // Verify all required fields are present
    expect(search.id).toBeDefined();
    expect(typeof search.id).toBe('number');
    expect(search.user_id).toBe(userId);
    expect(search.origin_city).toBe('Test Origin');
    expect(search.destination_city).toBe('Test Destination');
    expect(search.departure_date).toBeInstanceOf(Date);
    expect(search.return_date).toBeNull(); // Default null value
    expect(search.is_active).toBe(true);
    expect(search.created_at).toBeInstanceOf(Date);
    expect(search.updated_at).toBeInstanceOf(Date);
  });
});