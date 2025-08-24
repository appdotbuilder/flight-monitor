import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable } from '../db/schema';
import { type CreateFlightSearchInput } from '../schema';
import { createFlightSearch } from '../handlers/create_flight_search';
import { eq } from 'drizzle-orm';

describe('createFlightSearch', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number; email: string; created_at: Date | null; };

  beforeEach(async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    testUser = userResult[0];
  });

  const getTestInput = (overrides: Partial<CreateFlightSearchInput> = {}): CreateFlightSearchInput => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      user_id: testUser.id,
      origin_city: 'New York',
      destination_city: 'Los Angeles',
      departure_date: tomorrow,
      return_date: nextWeek,
      ...overrides
    };
  };

  it('should create a flight search successfully', async () => {
    const testInput = getTestInput();
    const result = await createFlightSearch(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.origin_city).toEqual('New York');
    expect(result.destination_city).toEqual('Los Angeles');
    expect(result.departure_date).toBeInstanceOf(Date);
    expect(result.return_date).toBeInstanceOf(Date);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save flight search to database', async () => {
    const testInput = getTestInput();
    const result = await createFlightSearch(testInput);

    // Query database to verify persistence
    const flightSearches = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, result.id))
      .execute();

    expect(flightSearches).toHaveLength(1);
    const saved = flightSearches[0];
    expect(saved.user_id).toEqual(testUser.id);
    expect(saved.origin_city).toEqual('New York');
    expect(saved.destination_city).toEqual('Los Angeles');
    expect(saved.is_active).toBe(true);
    expect(saved.created_at).toBeInstanceOf(Date);
  });

  it('should handle one-way flights (no return date)', async () => {
    const testInput = getTestInput({
      return_date: undefined
    });
    const result = await createFlightSearch(testInput);

    expect(result.return_date).toBeNull();
    expect(result.origin_city).toEqual('New York');
    expect(result.destination_city).toEqual('Los Angeles');

    // Verify in database
    const saved = await db.select()
      .from(flightSearchesTable)
      .where(eq(flightSearchesTable.id, result.id))
      .execute();

    expect(saved[0].return_date).toBeNull();
  });

  it('should handle explicit null return date', async () => {
    const testInput = getTestInput({
      return_date: null
    });
    const result = await createFlightSearch(testInput);

    expect(result.return_date).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const testInput = getTestInput({
      user_id: 99999 // Non-existent user ID
    });

    await expect(createFlightSearch(testInput)).rejects.toThrow(/User with id 99999 does not exist/i);
  });

  it('should throw error for past departure date', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const testInput = getTestInput({
      departure_date: yesterday
    });

    await expect(createFlightSearch(testInput)).rejects.toThrow(/Departure date must be in the future/i);
  });

  it('should throw error for return date before departure date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const today = new Date();

    const testInput = getTestInput({
      departure_date: tomorrow,
      return_date: today // Return date before departure
    });

    await expect(createFlightSearch(testInput)).rejects.toThrow(/Return date must be after departure date/i);
  });

  it('should allow same-day return (edge case)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const laterSameDay = new Date(tomorrow);
    laterSameDay.setHours(tomorrow.getHours() + 1);

    const testInput = getTestInput({
      departure_date: tomorrow,
      return_date: laterSameDay
    });

    const result = await createFlightSearch(testInput);
    expect(result.return_date).toEqual(laterSameDay);
  });

  it('should create multiple searches for same user', async () => {
    const testInput1 = getTestInput({
      destination_city: 'Chicago'
    });
    
    const testInput2 = getTestInput({
      destination_city: 'Miami'
    });

    const result1 = await createFlightSearch(testInput1);
    const result2 = await createFlightSearch(testInput2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.destination_city).toEqual('Chicago');
    expect(result2.destination_city).toEqual('Miami');
    expect(result1.user_id).toEqual(result2.user_id);
  });

  it('should create searches with different route combinations', async () => {
    const testInput = getTestInput({
      origin_city: 'San Francisco',
      destination_city: 'Boston'
    });

    const result = await createFlightSearch(testInput);
    
    expect(result.origin_city).toEqual('San Francisco');
    expect(result.destination_city).toEqual('Boston');
    expect(result.user_id).toEqual(testUser.id);
    expect(result.is_active).toBe(true);
  });
});