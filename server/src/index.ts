import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  createFlightSearchInputSchema,
  updateFlightSearchInputSchema,
  getFlightSearchesByUserInputSchema,
  createPriceRecordInputSchema,
  getPriceHistoryInputSchema,
  createAlertInputSchema,
  getAlertsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createFlightSearch } from './handlers/create_flight_search';
import { getFlightSearchesByUser } from './handlers/get_flight_searches';
import { updateFlightSearch } from './handlers/update_flight_search';
import { createPriceRecord } from './handlers/create_price_record';
import { getPriceHistory } from './handlers/get_price_history';
import { createAlert } from './handlers/create_alert';
import { getAlerts } from './handlers/get_alerts';
import { markAlertRead } from './handlers/mark_alert_read';
import { getActiveFlightSearches } from './handlers/get_active_searches';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Flight search management
  createFlightSearch: publicProcedure
    .input(createFlightSearchInputSchema)
    .mutation(({ input }) => createFlightSearch(input)),

  getFlightSearchesByUser: publicProcedure
    .input(getFlightSearchesByUserInputSchema)
    .query(({ input }) => getFlightSearchesByUser(input)),

  updateFlightSearch: publicProcedure
    .input(updateFlightSearchInputSchema)
    .mutation(({ input }) => updateFlightSearch(input)),

  getActiveFlightSearches: publicProcedure
    .query(() => getActiveFlightSearches()),

  // Price tracking
  createPriceRecord: publicProcedure
    .input(createPriceRecordInputSchema)
    .mutation(({ input }) => createPriceRecord(input)),

  getPriceHistory: publicProcedure
    .input(getPriceHistoryInputSchema)
    .query(({ input }) => getPriceHistory(input)),

  // Alerts management
  createAlert: publicProcedure
    .input(createAlertInputSchema)
    .mutation(({ input }) => createAlert(input)),

  getAlerts: publicProcedure
    .input(getAlertsInputSchema)
    .query(({ input }) => getAlerts(input)),

  markAlertRead: publicProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(({ input }) => markAlertRead(input.alertId))
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Flight Price Monitor TRPC server listening at port: ${port}`);
  console.log('Available endpoints:');
  console.log('- createUser: Create a new user account');
  console.log('- createFlightSearch: Start monitoring a flight route');
  console.log('- getFlightSearchesByUser: Get user\'s flight searches');
  console.log('- updateFlightSearch: Modify or deactivate a flight search');
  console.log('- getActiveFlightSearches: Get all active searches (for monitoring job)');
  console.log('- createPriceRecord: Record a new price point (internal use)');
  console.log('- getPriceHistory: Get price history for a flight search');
  console.log('- createAlert: Create a price change alert (internal use)');
  console.log('- getAlerts: Get alerts for user or flight search');
  console.log('- markAlertRead: Mark an alert as read');
}

start();