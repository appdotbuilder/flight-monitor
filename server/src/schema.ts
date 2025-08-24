import { z } from 'zod';

// Flight search schema - for individual searches/requests
export const flightSearchSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  origin_city: z.string(),
  destination_city: z.string(),
  departure_date: z.coerce.date(),
  return_date: z.coerce.date().nullable(), // Optional return date for one-way flights
  is_active: z.boolean(), // Whether monitoring is active
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type FlightSearch = z.infer<typeof flightSearchSchema>;

// Price record schema - for storing historical price data
export const priceRecordSchema = z.object({
  id: z.number(),
  flight_search_id: z.number(),
  price: z.number(), // Price in cents to avoid floating point issues
  currency: z.string(), // ISO currency code (USD, EUR, etc.)
  provider: z.string(), // Which service provided this price (placeholder for future API integration)
  recorded_at: z.coerce.date()
});

export type PriceRecord = z.infer<typeof priceRecordSchema>;

// Alert schema - for in-app notifications
export const alertSchema = z.object({
  id: z.number(),
  flight_search_id: z.number(),
  alert_type: z.enum(['price_drop', 'price_increase', 'price_target_reached']),
  old_price: z.number().nullable(), // Previous price (null for first alert)
  new_price: z.number(),
  currency: z.string(),
  message: z.string(), // Human-readable alert message
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type Alert = z.infer<typeof alertSchema>;

// User schema - basic user management
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  telegram_chat_id: z.string().nullable(), // For future Telegram bot integration
  notification_enabled: z.boolean(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schemas for creating/updating

export const createFlightSearchInputSchema = z.object({
  user_id: z.number(),
  origin_city: z.string().min(1),
  destination_city: z.string().min(1),
  departure_date: z.coerce.date(),
  return_date: z.coerce.date().nullable().optional() // Can be omitted or explicitly null
});

export type CreateFlightSearchInput = z.infer<typeof createFlightSearchInputSchema>;

export const updateFlightSearchInputSchema = z.object({
  id: z.number(),
  origin_city: z.string().min(1).optional(),
  destination_city: z.string().min(1).optional(),
  departure_date: z.coerce.date().optional(),
  return_date: z.coerce.date().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateFlightSearchInput = z.infer<typeof updateFlightSearchInputSchema>;

export const createUserInputSchema = z.object({
  email: z.string().email(),
  telegram_chat_id: z.string().nullable().optional(),
  notification_enabled: z.boolean().default(true)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createPriceRecordInputSchema = z.object({
  flight_search_id: z.number(),
  price: z.number().positive(),
  currency: z.string().length(3), // ISO currency codes are 3 letters
  provider: z.string().min(1)
});

export type CreatePriceRecordInput = z.infer<typeof createPriceRecordInputSchema>;

export const createAlertInputSchema = z.object({
  flight_search_id: z.number(),
  alert_type: z.enum(['price_drop', 'price_increase', 'price_target_reached']),
  old_price: z.number().nullable().optional(),
  new_price: z.number().positive(),
  currency: z.string().length(3),
  message: z.string().min(1)
});

export type CreateAlertInput = z.infer<typeof createAlertInputSchema>;

// Query input schemas

export const getFlightSearchesByUserInputSchema = z.object({
  user_id: z.number(),
  is_active: z.boolean().optional() // Filter by active status
});

export type GetFlightSearchesByUserInput = z.infer<typeof getFlightSearchesByUserInputSchema>;

export const getAlertsInputSchema = z.object({
  user_id: z.number().optional(),
  flight_search_id: z.number().optional(),
  is_read: z.boolean().optional()
});

export type GetAlertsInput = z.infer<typeof getAlertsInputSchema>;

export const getPriceHistoryInputSchema = z.object({
  flight_search_id: z.number(),
  limit: z.number().int().positive().optional() // Limit number of records returned
});

export type GetPriceHistoryInput = z.infer<typeof getPriceHistoryInputSchema>;