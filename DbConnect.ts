import 'dotenv/config';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString || !connectionString.startsWith('postgresql://')) {
  throw new Error('DATABASE_URL is missing or invalid. It must start with postgresql://');
}

const pool = new Pool({
  connectionString,
});


export default pool;
