import { ForbiddenException } from '@nestjs/common';
import { ErrorCodes } from '../errors/error-codes';

export interface TenantUserContext {
  sub: string;
  organizationId: string;
  branchId?: string;
}

export function withOrganizationScope<T extends Record<string, unknown>>(
  organizationId: string,
  where?: T,
): T & { organizationId: string } {
  return {
    ...(where ?? ({} as T)),
    organizationId,
  };
}

export function assertSameOrganization(
  resourceOrganizationId: string,
  requesterOrganizationId: string,
): void {
  if (resourceOrganizationId !== requesterOrganizationId) {
    throw new ForbiddenException({
      code: ErrorCodes.ACCESS_DENIED,
      message: 'Cross-organization access denied',
    });
  }
}

export function requireUserBranchId(user: TenantUserContext): string {
  if (!user.branchId) {
    throw new ForbiddenException({
      code: ErrorCodes.ACCESS_DENIED,
      message: 'User has no assigned branch',
    });
  }

  return user.branchId;
}
