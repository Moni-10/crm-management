import { calls } from './calls.js';
import { events } from './events.js';
import { machines } from './machines.js';
import { parties } from './parties.js';
import { quotations } from './quotations.js';
import { salespersons } from './salespersons.js';

// URL segment -> resource. Order matters for backups: parents before children.
export const resources = { salespersons, parties, machines, quotations, events, calls };
