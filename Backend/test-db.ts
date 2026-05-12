import { db } from './db';

async function test() {
  console.log('Testing database connection...');
  try {
    const result = await db.execute('SELECT 1');
    console.log('Success:', result);
    process.exit(0);
  } catch (err) {
    console.error('Database Connection Failed:', err);
    process.exit(1);
  }
}

test();
