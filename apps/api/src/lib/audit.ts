import { db } from '../db/client.js';

export async function logAudit(params: {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await db`
    INSERT INTO audit_log (admin_id, action, entity_type, entity_id, detail)
    VALUES (
      ${params.adminId},
      ${params.action},
      ${params.entityType},
      ${params.entityId},
      ${params.detail ? JSON.stringify(params.detail) : null}
    )
  `;
}
