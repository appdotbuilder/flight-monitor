import { type FlightSearch } from '../schema';

export async function getActiveFlightSearches(): Promise<FlightSearch[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all active flight searches across all users.
    // This will be used by the hourly price monitoring job to know which flights
    // to check for price updates. Only returns searches where is_active = true
    // and departure_date is in the future.
    return Promise.resolve([] as FlightSearch[]);
}