import { db } from "./db";
import { logAudit } from "./audit";

// USERS
export async function getUsers() {
    const { data, error } = await db.from('users').select('*');
    if (error) throw new Error(error.message);
    return data;
}

export async function getUser(id: string) {
    const { data, error } = await db.from('users').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
}

export async function loginUser(options: { email?: string, username?: string, password: string }) {
    let emailToUse = options.email;

    // If username is provided instead of email, we need to look up the email
    if (!emailToUse && options.username) {
        const { data: user, error: userError } = await db.from('users').select('email').eq('username', options.username).single();
        if (userError || !user) throw new Error("User not found with that username.");
        emailToUse = user.email;
    }

    if (!emailToUse) throw new Error("Email or username is required.");

    const { data, error } = await db.auth.signInWithPassword({
        email: emailToUse,
        password: options.password,
    });

    if (error) throw new Error("Login failed: " + error.message);
    
    // Fetch the public user data to return along with the auth session
    const { data: publicUser } = await db.from('users').select('*').eq('id', data.user.id).single();
    
    return { session: data.session, user: publicUser };
}

export async function getUserByEmail(email: string) {
    const { data, error } = await db.from('users').select('*').eq('email', email).single();
    if (error) throw new Error("User not found");
    return data;
}

export async function createUser(options: { id?: string, email: string, username: string, password?: string }) {
    let userId = options.id;

    // Because public.users.id has a Foreign Key to auth.users.id, 
    // we must create an auth user first if no ID is provided.
    if (!userId) {
        const { data: authData, error: authError } = await db.auth.admin.createUser({
            email: options.email,
            password: options.password || 'TestPassword123!', // Use provided password or fallback
            email_confirm: true
        });
        
        if (authError) throw new Error("Auth Error: " + authError.message);
        userId = authData.user.id;
    }

    const payload: any = { 
        id: userId,
        email: options.email, 
        username: options.username 
    };
    
    const { data, error } = await db.from('users').insert([payload]).select().single();
    if (error) throw new Error("DB Error: " + error.message);
    return data;
}

// DOCUMENTS
export async function getDocuments() {
    const { data, error } = await db.from('documents').select('*');
    if (error) throw new Error(error.message);
    return data;
}

export async function getDocument(documentId: number) {
    const { data, error } = await db.from('documents').select('*').eq('documentId', documentId).single();
    if (error) throw new Error(error.message);
    return data;
}

// Upload & Request Signature
export async function requestSignature(options: { requester: string, unsignedFile: File, signers: string | string[] }) {
    // 1. Upload the file to Supabase Storage
    const fileExt = options.unsignedFile.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `unsigned/${fileName}`;

    // Upload the file as an ArrayBuffer
    const { data: uploadData, error: uploadError } = await db.storage
        .from('documents')
        .upload(filePath, await options.unsignedFile.arrayBuffer(), {
            contentType: options.unsignedFile.type
        });

    if (uploadError) throw new Error("Storage Error: " + uploadError.message);

    // Get the public URL for the uploaded file
    const { data: publicUrlData } = db.storage.from('documents').getPublicUrl(filePath);
    const publicUrl = publicUrlData.publicUrl;

    // 2. Create the document in the database
    const { data: document, error: docError } = await db.from('documents').insert([{
        requester: options.requester,
        unsignedFile: publicUrl,
        status: 'pending'
    }]).select().single();

    if (docError) throw new Error("DB Error: " + docError.message);

    // 3. Create signature requests for each signer
    // Ensure signers is an array, even if a single string is passed in formData
    const signersArray = Array.isArray(options.signers) ? options.signers : [options.signers];
    
    const signatures = signersArray.map(signerId => ({
        documentId: document.documentId,
        signer: signerId,
        status: 'pending'
    }));

    const { data: signatureData, error: sigError } = await db.from('signatures').insert(signatures).select();

    if (sigError) throw new Error("Signature Error: " + sigError.message);

    return { document, signatures: signatureData };
}

// SIGNATURES
export async function getSignatures() {
    const { data, error } = await db.from('signatures').select('*');
    if (error) throw new Error(error.message);
    return data;
}

export async function getSignature(signatureId: number) {
    const { data, error } = await db.from('signatures').select('*').eq('signatureId', signatureId).single();
    if (error) throw new Error(error.message);
    return data;
}

// Sign the Document
export async function signDocument(options: { signatureId: number, signerId: string, signedFile: File }) {
    const sigId = Number(options.signatureId);
    const signerId = String(options.signerId);
    let uploadedFilePath: string | null = null;
    let existingSig: any = null;
    let existingDoc: any = null;

    try {
        // Pre-flight check: ensure signature and document exist
        const { data: existingSigData, error: fetchError } = await db.from('signatures')
            .select('*')
            .eq('signatureId', sigId);

        if (fetchError || !existingSigData || existingSigData.length === 0) {
            throw new Error(`Signature Update Error: Record not found. Expected signatureId: ${sigId}`);
        }
        existingSig = existingSigData[0];

        const { data: existingDocData, error: docFetchError } = await db.from('documents')
            .select('*')
            .eq('documentId', existingSig.documentId);

        if (docFetchError || !existingDocData || existingDocData.length === 0) {
            throw new Error(`Document not found for signature ID: ${sigId}`);
        }
        existingDoc = existingDocData[0];

        // 1. Upload the signed file to Supabase Storage
        const fileExt = options.signedFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `signed/${fileName}`;

        const { data: uploadData, error: uploadError } = await db.storage
            .from('documents')
            .upload(filePath, await options.signedFile.arrayBuffer(), {
                contentType: options.signedFile.type
            });

        if (uploadError) throw new Error("Storage Error: " + uploadError.message);
        
        uploadedFilePath = filePath;

        const { data: publicUrlData } = db.storage.from('documents').getPublicUrl(filePath);
        const publicUrl = publicUrlData.publicUrl;

        if (!publicUrl) throw new Error("Validation Error: public URL for signedFile is null");

        // 2. Update the signature record
        const { data: signatureData, error: sigError } = await db.from('signatures')
            .update({ status: 'signed', signed_at: new Date().toISOString() })
            .eq('signatureId', sigId)
            .select();

        if (sigError) throw new Error("Signature Update Error: " + sigError.message);
        
        const finalSignature = (signatureData && signatureData.length > 0) ? signatureData[0] : existingSig;

        // 3. Update the document with the signed file and status
        const { data: documentData, error: docError } = await db.from('documents')
            .update({ signedFile: publicUrl, status: 'completed' })
            .eq('documentId', finalSignature.documentId)
            .select();

        if (docError) throw new Error("Document Update Error: " + docError.message);

        const finalDocument = (documentData && documentData.length > 0) ? documentData[0] : null;

        // Validation: confirm signedFile is non-null
        if (!finalDocument || !finalDocument.signedFile) {
            throw new Error("Validation Error: signedFile column update failed (returned null).");
        }

        // Audit Log
        await logAudit("SIGNATURE_SUBMITTED", {
            signatureId: sigId,
            signerId,
            documentId: finalDocument.documentId,
            signedFileUrl: finalDocument.signedFile
        });

        return { signature: finalSignature, document: finalDocument };

    } catch (err: any) {
        console.error("signDocument transaction failed, rolling back:", err.message);

        // Manual Rollback
        if (uploadedFilePath) {
            try {
                await db.storage.from('documents').remove([uploadedFilePath]);
            } catch (e) {
                console.error("Rollback Storage Error:", e);
            }
        }

        // Rollback DB records if they were modified
        if (existingSig) {
            try {
                await db.from('signatures')
                    .update({ status: existingSig.status, signed_at: existingSig.signed_at })
                    .eq('signatureId', sigId);
            } catch(e) {
                console.error("Rollback Signature Error:", e);
            }
        }
        
        if (existingDoc) {
            try {
                await db.from('documents')
                    .update({ signedFile: existingDoc.signedFile, status: existingDoc.status })
                    .eq('documentId', existingDoc.documentId);
            } catch(e) {
                console.error("Rollback Document Error:", e);
            }
        }

        // Audit log the failure
        await logAudit("SIGNATURE_SUBMIT_FAILED", {
            signatureId: sigId,
            signerId,
            error: err.message
        });

        throw err;
    }
}

// Cancel Signature
export async function cancelSignature(signatureId: number, signerId: string) {
    const sigId = Number(signatureId);
    
    const { data: existingSigData, error: fetchError } = await db.from('signatures')
        .select('*')
        .eq('signatureId', sigId);

    if (fetchError || !existingSigData || existingSigData.length === 0) {
        throw new Error(`Signature Cancel Error: Record not found.`);
    }

    await logAudit("SIGNATURE_CANCELLED", {
        signatureId: sigId,
        signerId,
        documentId: existingSigData[0].documentId,
        status: existingSigData[0].status
    });

    return { message: "Cancellation logged successfully.", signature: existingSigData[0] };
}
