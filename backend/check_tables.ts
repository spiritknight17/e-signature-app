import { db } from './src/db';

async function checkTables() {
    const { data, error } = await db.from('documents').select('*').limit(1);
    console.log("Documents:", data, error);
}

checkTables();
