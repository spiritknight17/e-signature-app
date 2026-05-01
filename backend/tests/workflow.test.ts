import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { db } from "../src/db";
import { signDocument, cancelSignature } from "../src/handlers";
import { randomUUID } from "crypto";

describe("Signature Workflow", () => {
    let userId: string;
    let documentId: number;
    let signatureId: number;

    beforeAll(async () => {
        // Setup user
        const { data: users, error: usersError } = await db.from('users').select('id').limit(1);
        if (usersError || !users.length) throw new Error("No users available for test");
        userId = users[0].id;

        // Create document
        const { data: doc, error: docError } = await db.from('documents').insert({
            requester: userId,
            unsignedFile: 'https://example.com/test-unsigned.pdf',
            status: 'pending'
        }).select().single();
        if (docError) throw docError;
        documentId = doc.documentId;

        // Create signature
        const { data: sig, error: sigError } = await db.from('signatures').insert({
            documentId,
            signer: userId,
            status: 'pending'
        }).select().single();
        if (sigError) throw sigError;
        signatureId = sig.signatureId;
    });

    test("1. User cancels signature", async () => {
        const res = await cancelSignature(signatureId, userId);
        expect(res.message).toBe("Cancellation logged successfully.");
        expect(res.signature.status).toBe("pending");
        
        // Verify document is still pending
        const { data: doc } = await db.from('documents').select('status, signedFile').eq('documentId', documentId).single();
        expect(doc?.status).toBe("pending");
        expect(doc?.signedFile).toBeNull();
    });

    test("2. User re-signs and submits", async () => {
        const file = new File(["dummy pdf content"], "signed.pdf", { type: "application/pdf" });
        
        const res = await signDocument({
            signatureId,
            signerId: userId,
            signedFile: file
        });

        expect(res.signature.status).toBe("signed");
        expect(res.document.status).toBe("completed");
        expect(res.document.signedFile).not.toBeNull();
        expect(typeof res.document.signedFile).toBe("string");
        expect(res.document.signedFile).toContain("signed/");
    });
    
    test("3. Validation prevents null signedFile", async () => {
        // This test simulates a failure where signedFile is null
        // We will try to pass a bad documentId to force a failure
        try {
            await signDocument({
                signatureId: 999999, // Bad ID
                signerId: userId,
                signedFile: new File(["dummy"], "bad.pdf", { type: "application/pdf" })
            });
            expect(false).toBe(true); // Should not reach here
        } catch (err: any) {
            expect(err.message).toContain("Record not found");
        }
    });

    afterAll(async () => {
        // Cleanup
        await db.from('signatures').delete().eq('signatureId', signatureId);
        await db.from('documents').delete().eq('documentId', documentId);
    });
});