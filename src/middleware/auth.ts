import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthRequest, UserRole } from '../types';
import { fail } from '../utils/response';

export function authenticate(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      fail(res, 401, 'No token provided');
      return;
    }

    try {
      const payload = verifyToken(header.slice(7));

      if (roles.length && !roles.includes(payload.role)) {
        fail(res, 403, 'Forbidden — insufficient role');
        return;
      }

      req.user = payload;
      next();
    } catch {
      fail(res, 401, 'Invalid or expired token');
    }
  };
}
