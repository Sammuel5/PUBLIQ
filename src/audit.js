import { randomUUID } from 'node:crypto';

export async function recordAudit(db, { actor, restaurantId = null, action, targetEntityType, targetEntityId, changes = {} , requestId }) {
  const event = {
    _id: randomUUID(),
    actorUserId: actor?._id ?? null,
    restaurantId: restaurantId ?? null,
    action,
    targetEntityType,
    targetEntityId: String(targetEntityId ?? ''),
    changes,
    requestId: requestId ?? null,
    createdAt: new Date(),
  };
  await db.collection('auditEvents').insertOne(event);
  return event;
}

export function publicAuditEvent(event) {
  return {
    id: event._id,
    actorUserId: event.actorUserId,
    restaurantId: event.restaurantId,
    action: event.action,
    targetEntityType: event.targetEntityType,
    targetEntityId: event.targetEntityId,
    changes: event.changes,
    requestId: event.requestId,
    createdAt: event.createdAt,
  };
}
