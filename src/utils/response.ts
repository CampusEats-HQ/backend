import { Response } from 'express';

export function ok(res: Response, data: object, status = 200): Response {
  return res.status(status).json(data);
}

export function created(res: Response, data: object): Response {
  return res.status(201).json(data);
}

export function fail(res: Response, status: number, message: string, details?: object): Response {
  return res.status(status).json({ error: message, ...details });
}
