import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { persistAll } from './persist';

export const worker = setupWorker(...handlers);

// Persist the mock database after every mutating request so data survives reloads.
worker.events.on('response:mocked', ({ request }) => {
  if (request.method !== 'GET') {
    persistAll();
  }
});
