import { prisma } from "../db";
import type { ActivityKind, Prisma } from "../generated/prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

/** Adds an entry to the dashboard's "Recent activity" feed. */
export function addActivity(db: Db, userId: string, label: string, detail: string, kind: ActivityKind) {
  return db.activity.create({ data: { userId, label, detail, kind } });
}

export function addNotification(db: Db, userId: string, title: string, body: string, kind: string) {
  return db.notification.create({ data: { userId, title, body, kind } });
}

export async function listNotifications(userId: string) {
  const rows = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    read: n.readAt !== null,
    time: n.createdAt.toISOString(),
  }));
}

export function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({ where: { id: notificationId, userId, readAt: null }, data: { readAt: new Date() } });
}
