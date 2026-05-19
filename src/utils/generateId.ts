import { v4 as uuidv4 } from 'uuid';

let orderCounter = 1000;

export function generateOrderId(): string {
  return `ORD-${++orderCounter}`;
}

export function generatePublicId(prefix: string): string {
  return `${prefix}_${uuidv4().replace(/-/g, '').slice(0, 10)}`;
}

export function generateSettlementRef(): string {
  const today = new Date().toISOString().slice(0, 10);
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `REF-${today}-${seq}`;
}

export function generateSettlementId(): string {
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `SET-${seq}`;
}
