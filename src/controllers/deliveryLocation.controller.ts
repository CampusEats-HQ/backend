import { Request, Response } from 'express';
import { ok } from '../utils/response';

const LOCATIONS = [
  'Eni-Jokun Hostel',
  'Jaja Hostel',
  'Kofo Ademola Hostel',
  'Fabian House',
  'Madam Tinubu Hostel',
  'Moremi Hall',
  'Independence Hall',
  'Biobaku Hall',
  'Angola Hall',
  'Sultan Bello Hall',
];

export function getDeliveryLocations(_req: Request, res: Response): void {
  ok(res, { locations: LOCATIONS });
}
