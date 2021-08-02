import autotask_webhook from './express.js';
import bolt from './bolt.js';

await bolt.start();
autotask_webhook.listen(3000);