import 'express';

declare module 'express' {
  interface Request {
    user?: {
      sub: string;
      sid?: string;
      organizationId: string;
      branchId?: string;
    };
    requestId?: string;
  }
}
