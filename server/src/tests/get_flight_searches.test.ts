import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable } from '../db/schema';
import { type GetFlightSearchesByUserInput } from '../schema';
import { getFlightSearchesByUser } from '../handlers/get_flight_searches';

describe('getFlightSearchesByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return flight searches for a specific user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test flight searches
    await db.insert(flightSearchesTable)
      .values([
        {
          user_id: userId,
          origin_city: 'New York',
          destination_city: 'London',
          departure_date: new Date('2024-06-15'),
          return_date: new Date('2024-06-22'),
          is_active: true
        },
        {
          user_id: userId,
          origin_city: 'Paris',
          destination_city: 'Tokyo',
          departure_date: new Date('2024-07-10'),
          return_date: null, // One-way flight
          is_active: true
        }
      ])
      .execute();

    const input: GetFlightSearchesByUserInput = {
      user_id: userId
    };

    const result = await getFlightSearchesByUser(input);

    expect(result).toHaveLength(2);
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].origin_city).toEqual('New York');
    expect(result[0].destination_city).toEqual('London');
    expect(result[0].departure_date).toBeInstanceOf(Date);
    expect(result[0].return_date).toBeInstanceOf(Date);
    expect(result[0].is_active).toBe(true);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    expect(result[1].user_id).toEqual(userId);
    expect(result[1].origin_city).toEqual('Paris');
    expect(result[1].destination_city).toEqual('Tokyo');
    expect(result[1].return_date).toBeNull(); // One-way flight
    expect(result[1].is_active).toBe(true);
  });

  it('should return empty array when user has no flight searches', async () => {
    // Create test user without any flight searches
    const userResult = await db.insert(usersTable)
      .values({
        email: 'empty@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const input: GetFlightSearchesByUserInput = {
      user_id: userId
    };

    const result = await getFlightSearchesByUser(input);

    expect(result).toHaveLength(0);
  });

  it('should filter by active status when specified', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'filter@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create flight searches with different active statuses
    await db.insert(flightSearchesTable)
      .values([
        {
          user_id: userId,
          origin_city: 'Boston',
          destination_city: 'Rome',
          departure_date: new Date('2024-08-01'),
          return_date: new Date('2024-08-10'),
          is_active: true
        },
        {
          user_id: userId,
          origin_city: 'Chicago',
          destination_city: 'Berlin',
          departure_date: new Date('2024-09-01'),
          return_date: new Date('2024-09-08'),
          is_active: false
        },
        {
          user_id: userId,
          origin_city: 'Miami',
          destination_city: 'Barcelona',
          departure_date: new Date('2024-10-01'),
          return_date: null,
          is_active: true
        }
      ])
      .execute();

    // Test filtering for active searches only
    const activeInput: GetFlightSearchesByUserInput = {
      user_id: userId,
      is_active: true
    };

    const activeResult = await getFlightSearchesByUser(activeInput);

    expect(activeResult).toHaveLength(2);
    activeResult.forEach(search => {
      expect(search.is_active).toBe(true);
      expect(search.user_id).toEqual(userId);
    });

    // Test filtering for inactive searches only
    const inactiveInput: GetFlightSearchesByUserInput = {
      user_id: userId,
      is_active: false
    };

    const inactiveResult = await getFlightSearchesByUser(inactiveInput);

    expect(inactiveResult).toHaveLength(1);
    expect(inactiveResult[0].is_active).toBe(false);
    expect(inactiveResult[0].origin_city).toEqual('Chicago');
    expect(inactiveResult[0].destination_city).toEqual('Berlin');
  });

  it('should only return searches for the specified user', async () => {
    // Create two test users
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

    // Create flight searches for both users
    await db.insert(flightSearchesTable)
      .values([
        {
          user_id: user1Id,
          origin_city: 'Seattle',
          destination_city: 'Amsterdam',
          departure_date: new Date('2024-05-15'),
          return_date: new Date('2024-05-25'),
          is_active: true
        },
        {
          user_id: user2Id,
          origin_city: 'Denver',
          destination_city: 'Prague',
          departure_date: new Date('2024-06-01'),
          return_date: new Date('2024-06-10'),
          is_active: true
        }
      ])
      .execute();

    const input: GetFlightSearchesByUserInput = {
      user_id: user1Id
    };

    const result = await getFlightSearchesByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Id);
    expect(result[0].origin_city).toEqual('Seattle');
    expect(result[0].destination_city).toEqual('Amsterdam');
  });

  it('should handle non-existent user gracefully', async () => {
    const input: GetFlightSearchesByUserInput = {
      user_id: 99999 // Non-existent user ID
    };

    const result = await getFlightSearchesByUser(input);

    expect(result).toHaveLength(0);
  });

  it('should maintain proper date types in results', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'dates@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create flight search with specific dates
    const departureDate = new Date('2024-12-25');
    const returnDate = new Date('2025-01-05');
    
    await db.insert(flightSearchesTable)
      .values({
        user_id: userId,
        origin_city: 'Los Angeles',
        destination_city: 'Sydney',
        departure_date: departureDate,
        return_date: returnDate,
        is_active: true
      })
      .execute();

    const input: GetFlightSearchesByUserInput = {
      user_id: userId
    };

    const result = await getFlightSearchesByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].departure_date).toBeInstanceOf(Date);
    expect(result[0].return_date).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    
    // Verify date values are preserved correctly
    expect(result[0].departure_date.toISOString().split('T')[0]).toEqual('2024-12-25');
    expect(result[0].return_date!.toISOString().split('T')[0]).toEqual('2025-01-05');
  });
});