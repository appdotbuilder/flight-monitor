import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, flightSearchesTable, priceRecordsTable } from '../db/schema';
import { type CreatePriceRecordInput } from '../schema';
import { createPriceRecord } from '../handlers/create_price_record';
import { eq } from 'drizzle-orm';

describe('createPriceRecord', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testFlightSearchId: number;
  let inactiveFlightSearchId: number;

  const setupTestData = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        notification_enabled: true
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create active flight search
    const flightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: testUserId,
        origin_city: 'New York',
        destination_city: 'London',
        departure_date: new Date('2024-06-15'),
        return_date: new Date('2024-06-20'),
        is_active: true
      })
      .returning()
      .execute();
    testFlightSearchId = flightSearchResult[0].id;

    // Create inactive flight search for testing
    const inactiveFlightSearchResult = await db.insert(flightSearchesTable)
      .values({
        user_id: testUserId,
        origin_city: 'Paris',
        destination_city: 'Rome',
        departure_date: new Date('2024-07-01'),
        return_date: new Date('2024-07-07'),
        is_active: false
      })
      .returning()
      .execute();
    inactiveFlightSearchId = inactiveFlightSearchResult[0].id;
  };

  const testInput: CreatePriceRecordInput = {
    flight_search_id: 0, // Will be set in tests
    price: 59999, // $599.99 in cents
    currency: 'USD',
    provider: 'TestProvider'
  };

  it('should create a price record successfully', async () => {
    await setupTestData();
    
    const input = { ...testInput, flight_search_id: testFlightSearchId };
    const result = await createPriceRecord(input);

    // Validate returned data
    expect(result.id).toBeDefined();
    expect(result.flight_search_id).toEqual(testFlightSearchId);
    expect(result.price).toEqual(59999);
    expect(result.currency).toEqual('USD');
    expect(result.provider).toEqual('TestProvider');
    expect(result.recorded_at).toBeInstanceOf(Date);
  });

  it('should save price record to database', async () => {
    await setupTestData();
    
    const input = { ...testInput, flight_search_id: testFlightSearchId };
    const result = await createPriceRecord(input);

    // Verify record exists in database
    const priceRecords = await db.select()
      .from(priceRecordsTable)
      .where(eq(priceRecordsTable.id, result.id))
      .execute();

    expect(priceRecords).toHaveLength(1);
    expect(priceRecords[0].flight_search_id).toEqual(testFlightSearchId);
    expect(priceRecords[0].price).toEqual(59999);
    expect(priceRecords[0].currency).toEqual('USD');
    expect(priceRecords[0].provider).toEqual('TestProvider');
    expect(priceRecords[0].recorded_at).toBeInstanceOf(Date);
  });

  it('should throw error when flight search does not exist', async () => {
    await setupTestData();
    
    const input = { ...testInput, flight_search_id: 999999 }; // Non-existent ID
    
    expect(createPriceRecord(input)).rejects.toThrow(/flight search.*not found/i);
  });

  it('should throw error when flight search is inactive', async () => {
    await setupTestData();
    
    const input = { ...testInput, flight_search_id: inactiveFlightSearchId };
    
    expect(createPriceRecord(input)).rejects.toThrow(/flight search.*not active/i);
  });

  it('should handle different currencies and providers', async () => {
    await setupTestData();
    
    const inputs = [
      { ...testInput, flight_search_id: testFlightSearchId, currency: 'EUR', provider: 'Kayak' },
      { ...testInput, flight_search_id: testFlightSearchId, currency: 'GBP', provider: 'Expedia' },
      { ...testInput, flight_search_id: testFlightSearchId, currency: 'JPY', provider: 'Skyscanner' }
    ];

    const results = await Promise.all(inputs.map(input => createPriceRecord(input)));

    expect(results).toHaveLength(3);
    expect(results[0].currency).toEqual('EUR');
    expect(results[0].provider).toEqual('Kayak');
    expect(results[1].currency).toEqual('GBP');
    expect(results[1].provider).toEqual('Expedia');
    expect(results[2].currency).toEqual('JPY');
    expect(results[2].provider).toEqual('Skyscanner');
  });

  it('should create multiple price records for same flight search', async () => {
    await setupTestData();
    
    const inputs = [
      { ...testInput, flight_search_id: testFlightSearchId, price: 50000 }, // $500.00
      { ...testInput, flight_search_id: testFlightSearchId, price: 55000 }, // $550.00
      { ...testInput, flight_search_id: testFlightSearchId, price: 45000 }  // $450.00
    ];

    const results = await Promise.all(inputs.map(input => createPriceRecord(input)));

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result.flight_search_id).toEqual(testFlightSearchId);
      expect(result.id).toBeDefined();
    });

    // Verify all records exist in database
    const allPriceRecords = await db.select()
      .from(priceRecordsTable)
      .where(eq(priceRecordsTable.flight_search_id, testFlightSearchId))
      .execute();

    expect(allPriceRecords).toHaveLength(3);
    const prices = allPriceRecords.map(record => record.price).sort();
    expect(prices).toEqual([45000, 50000, 55000]);
  });

  it('should handle zero price correctly', async () => {
    await setupTestData();
    
    const input = { ...testInput, flight_search_id: testFlightSearchId, price: 0 };
    
    // Zero price should be accepted by the handler since Zod validation happens before handler is called
    // The handler trusts that input has already been validated by Zod
    const result = await createPriceRecord(input);
    
    expect(result.price).toEqual(0);
    expect(result.flight_search_id).toEqual(testFlightSearchId);
  });
});