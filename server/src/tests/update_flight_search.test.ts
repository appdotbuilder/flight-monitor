import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { flightSearchesTable, usersTable } from '../db/schema';
import { type UpdateFlightSearchInput, type CreateUserInput, type CreateFlightSearchInput } from '../schema';
import { updateFlightSearch } from '../handlers/update_flight_search';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  email: 'test@example.com',
  notification_enabled: true
};

// Test flight search data
const testFlightSearch: CreateFlightSearchInput = {
  user_id: 1,
  origin_city: 'New York',
  destination_city: 'London',
  departure_date: new Date('2024-06-15'),
  return_date: new Date('2024-06-22')
};

describe('updateFlightSearch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testFlightSearchId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        notification_enabled: testUser.notification_enabled
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: testUserId,
        origin_city: testFlightSearch.origin_city,
        destination_city: testFlightSearch.destination_city,
        departure_date: testFlightSearch.departure_date,
        return_date: testFlightSearch.return_date,
        is_active: true
      })
      .returning()
      .execute();
    
    testFlightSearchId = flightSearchResult[0].id;
  });

  it('should update flight search with all fields', async () => {
    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      origin_city: 'Paris',
      destination_city: 'Tokyo',
      departure_date: new Date('2024-07-01'),
      return_date: new Date('2024-07-15'),
      is_active: false
    };

    const result = await updateFlightSearch(updateInput);

    expect(result.id).toEqual(testFlightSearchId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.origin_city).toEqual('Paris');
    expect(result.destination_city).toEqual('Tokyo');
    expect(result.departure_date).toEqual(new Date('2024-07-01'));
    expect(result.return_date).toEqual(new Date('2024-07-15'));
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      origin_city: 'Berlin',
      is_active: false
    };

    const result = await updateFlightSearch(updateInput);

    expect(result.id).toEqual(testFlightSearchId);
    expect(result.origin_city).toEqual('Berlin');
    expect(result.destination_city).toEqual('London'); // Original value preserved
    expect(result.departure_date).toEqual(new Date('2024-06-15')); // Original value preserved
    expect(result.return_date).toEqual(new Date('2024-06-22')); // Original value preserved
    expect(result.is_active).toEqual(false);
  });

  it('should update return_date to null for one-way flight', async () => {
    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      return_date: null
    };

    const result = await updateFlightSearch(updateInput);

    expect(result.return_date).toBeNull();
    expect(result.origin_city).toEqual('New York'); // Original value preserved
    expect(result.destination_city).toEqual('London'); // Original value preserved
  });

  it('should update departure_date only', async () => {
    const newDepartureDate = new Date('2024-08-01');
    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      departure_date: newDepartureDate
    };

    const result = await updateFlightSearch(updateInput);

    expect(result.departure_date).toEqual(newDepartureDate);
    expect(result.return_date).toEqual(new Date('2024-06-22')); // Original value preserved
    expect(result.origin_city).toEqual('New York'); // Original value preserved
    expect(result.destination_city).toEqual('London'); // Original value preserved
    expect(result.is_active).toEqual(true); // Original value preserved
  });

  it('should save updates to database', async () => {
    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      destination_city: 'Madrid',
      is_active: false
    };

    await updateFlightSearch(updateInput);

    // Verify in database
    const searches = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, testFlightSearchId))
      .execute();

    expect(searches).toHaveLength(1);
    expect(searches[0].destination_city).toEqual('Madrid');
    expect(searches[0].is_active).toEqual(false);
    expect(searches[0].origin_city).toEqual('New York'); // Original value preserved
    expect(searches[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    // Get original updated_at
    const originalSearch = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, testFlightSearchId))
      .execute();

    const originalUpdatedAt = originalSearch[0].updated_at;

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      origin_city: 'Rome'
    };

    const result = await updateFlightSearch(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when flight search does not exist', async () => {
    const updateInput: UpdateFlightSearchInput = {
      id: 99999,
      origin_city: 'Paris'
    };

    await expect(updateFlightSearch(updateInput)).rejects.toThrow(/Flight search with id 99999 not found/i);
  });

  it('should handle empty update (only timestamp changes)', async () => {
    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId
    };

    const result = await updateFlightSearch(updateInput);

    // Should return updated record with new timestamp but same values
    expect(result.id).toEqual(testFlightSearchId);
    expect(result.origin_city).toEqual('New York');
    expect(result.destination_city).toEqual('London');
    expect(result.departure_date).toEqual(new Date('2024-06-15'));
    expect(result.return_date).toEqual(new Date('2024-06-22'));
    expect(result.is_active).toEqual(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve created_at timestamp', async () => {
    // Get original created_at
    const originalSearch = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, testFlightSearchId))
      .execute();

    const originalCreatedAt = originalSearch[0].created_at;

    const updateInput: UpdateFlightSearchInput = {
      id: testFlightSearchId,
      origin_city: 'Amsterdam'
    };

    const result = await updateFlightSearch(updateInput);

    expect(result.created_at).toEqual(originalCreatedAt);
  });
});