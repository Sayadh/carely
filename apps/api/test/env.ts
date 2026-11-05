process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'mysql://carely:carely_dev@localhost:3306/carely_test?connection_limit=10';
process.env.APP_ORIGIN = 'http://localhost:3000';
process.env.MAIL_DRIVER = 'database';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = './var/test-storage';
process.env.JOBS_TOKEN = 'test-jobs-token-test-jobs-token-0000';
process.env.DEMO_MODE = 'false';
// The legacy direct-booking flow stays covered by api.spec.ts; leads.spec.ts checks it is off by default in production config.
process.env.DIRECT_REQUESTS_ENABLED = 'true';
