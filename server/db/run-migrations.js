// npm run migrate          apply pending migrations
// npm run migrate:status   list applied / pending
import { migrate, status } from './migrate.js';

try {
    if (process.argv[2] === 'status') {
        for (const m of await status()) console.log(`${m.applied ? '[x]' : '[ ]'} ${m.name}`);
    } else {
        await migrate();
    }
} catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
}
