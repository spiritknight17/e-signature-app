import * as fs from 'fs/promises';
import * as path from 'path';

const AUDIT_LOG_FILE = path.join(process.cwd(), 'audit.log');

export async function logAudit(action: string, details: any) {
    const timestamp = new Date().toISOString();
    const logEntry = JSON.stringify({ timestamp, action, ...details }) + '\n';
    try {
        await fs.appendFile(AUDIT_LOG_FILE, logEntry);
        console.log(`[AUDIT] ${action}:`, details);
    } catch (err) {
        console.error('Failed to write to audit log:', err);
    }
}
