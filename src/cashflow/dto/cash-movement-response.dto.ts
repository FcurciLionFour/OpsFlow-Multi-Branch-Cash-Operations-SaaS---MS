import { CashMovementStatus, CashMovementType } from '@prisma/client';

export class CashMovementResponseDto {
  id: string;
  organizationId: string;
  branchId: string;
  type: CashMovementType;
  amount: string;
  description?: string | null;
  status: CashMovementStatus;
  createdById: string;
  approvedById?: string | null;
  approvedAt?: Date | null;
  createdAt: Date;
}
