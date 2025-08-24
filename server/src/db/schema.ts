import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for alert types
export const alertTypeEnum = pgEnum('alert_type', ['price_drop', 'price_increase', 'price_target_reached']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  telegram_chat_id: text('telegram_chat_id'), // Nullable for future Telegram integration
  notification_enabled: boolean('notification_enabled').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Flight searches table - stores user's flight monitoring requests
export const flightSearchesTable = pgTable('flight_searches', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  origin_city: text('origin_city').notNull(),
  destination_city: text('destination_city').notNull(),
  departure_date: timestamp('departure_date').notNull(),
  return_date: timestamp('return_date'), // Nullable for one-way flights
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Price records table - stores historical price data
export const priceRecordsTable = pgTable('price_records', {
  id: serial('id').primaryKey(),
  flight_search_id: integer('flight_search_id').notNull().references(() => flightSearchesTable.id, { onDelete: 'cascade' }),
  price: integer('price').notNull(), // Price in cents to avoid floating point issues
  currency: text('currency').notNull(), // ISO currency code (USD, EUR, etc.)
  provider: text('provider').notNull(), // Which service provided this price
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
});

// Alerts table - stores in-app notifications
export const alertsTable = pgTable('alerts', {
  id: serial('id').primaryKey(),
  flight_search_id: integer('flight_search_id').notNull().references(() => flightSearchesTable.id, { onDelete: 'cascade' }),
  alert_type: alertTypeEnum('alert_type').notNull(),
  old_price: integer('old_price'), // Previous price (null for first alert)
  new_price: integer('new_price').notNull(),
  currency: text('currency').notNull(),
  message: text('message').notNull(), // Human-readable alert message
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations for better query building
export const usersRelations = relations(usersTable, ({ many }) => ({
  flightSearches: many(flightSearchesTable),
}));

export const flightSearchesRelations = relations(flightSearchesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [flightSearchesTable.user_id],
    references: [usersTable.id],
  }),
  priceRecords: many(priceRecordsTable),
  alerts: many(alertsTable),
}));

export const priceRecordsRelations = relations(priceRecordsTable, ({ one }) => ({
  flightSearch: one(flightSearchesTable, {
    fields: [priceRecordsTable.flight_search_id],
    references: [flightSearchesTable.id],
  }),
}));

export const alertsRelations = relations(alertsTable, ({ one }) => ({
  flightSearch: one(flightSearchesTable, {
    fields: [alertsTable.flight_search_id],
    references: [flightSearchesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type FlightSearch = typeof flightSearchesTable.$inferSelect;
export type NewFlightSearch = typeof flightSearchesTable.$inferInsert;

export type PriceRecord = typeof priceRecordsTable.$inferSelect;
export type NewPriceRecord = typeof priceRecordsTable.$inferInsert;

export type Alert = typeof alertsTable.$inferSelect;
export type NewAlert = typeof alertsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  flightSearches: flightSearchesTable,
  priceRecords: priceRecordsTable,
  alerts: alertsTable,
};