import { db } from './src/db';

async function runTest() {
  const { data, error } = await db.from('documents').update({ status: 'completed' }).eq('documentId', 15).select();
  console.log(data);
}

runTest();
