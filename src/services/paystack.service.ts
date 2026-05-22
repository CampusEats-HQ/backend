import crypto from 'crypto';

const SECRET = process.env.PAYSTACK_SECRET_KEY!;
const BASE = 'https://api.paystack.co';

async function request<T>(method: string, path: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json() as Promise<T>;
}

export async function initializeTransaction(email: string, amountKobo: number, reference: string): Promise<{ authorization_url: string; reference: string }> {
  const data = await request<{ status: boolean; data: { authorization_url: string; reference: string } }>(
    'POST', '/transaction/initialize',
    { email, amount: amountKobo, reference, currency: 'NGN' }
  );
  return data.data;
}

export async function verifyTransaction(reference: string): Promise<{ status: string; amount: number }> {
  const data = await request<{ status: boolean; data: { status: string; amount: number } }>(
    'GET', `/transaction/verify/${encodeURIComponent(reference)}`
  );
  return data.data;
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const hash = crypto.createHmac('sha512', SECRET).update(rawBody).digest('hex');
  return hash === signature;
}
