import { db } from './src/db';
import { signDocument, cancelSignature } from './src/handlers';
import { randomUUID } from 'crypto';

async function runTest() {
  console.log('--- STARTING TEST ---');
  const { data: users, error: usersError } = await db.from('users').select('id').limit(1);
  if (usersError || !users.length) throw new Error('No users found');
  const userId = users[0].id;
  const requester = userId;
  const signerId = userId;

  // 2. Create document
  const { data: doc, error: docError } = await db.from('documents').insert({
    requester,
    unsignedFile: 'https://example.com/unsigned.pdf',
    status: 'pending'
  }).select().single();
  if (docError) throw docError;
  console.log('Created doc:', doc);

  // 3. Create signature
  const { data: sig, error: sigError } = await db.from('signatures').insert({
    documentId: doc.documentId,
    signer: signerId,
    status: 'pending'
  }).select().single();
  if (sigError) throw sigError;
  console.log('Created sig:', sig);

  // 4. Cancel
  console.log('Cancelling...');
  await cancelSignature(sig.signatureId, signerId);
  console.log('Cancelled.');

  // 5. Re-sign
  console.log('Re-signing...');
  // Fake file
  const file = new File(['test'], 'signed.pdf', { type: 'application/pdf' });
  try {
    const res = await signDocument({
      signatureId: sig.signatureId,
      signerId: signerId,
      signedFile: file
    });
    console.log('Re-sign result:', res);
  } catch (err: any) {
    console.error('Re-sign error:', err.message);
  }
}

runTest().catch(console.error);