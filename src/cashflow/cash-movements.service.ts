import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementStatus, CashMovementType } from '@prisma/client';
import { ErrorCodes } from 'src/common/errors/error-codes';
import {
  requireUserBranchId,
  TenantUserContext,
  withOrganizationScope,
} from 'src/common/tenant/tenant-scope';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashMovementResponseDto } from './dto/cash-movement-response.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { ListCashMovementsDto } from './dto/list-cash-movements.dto';

@Injectable()
export class CashMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    currentUser: TenantUserContext,
    dto: CreateCashMovementDto,
  ): Promise<CashMovementResponseDto> {
    const roles = await this.getUserRoles(currentUser.sub);
    const isOperator = roles.includes('OPERATOR');
    const branchId = isOperator
      ? requireUserBranchId(currentUser)
      : (dto.branchId ?? currentUser.branchId);

    if (!branchId) {
      throw new ForbiddenException({
        code: ErrorCodes.ACCESS_DENIED,
        message: 'Branch is required for this operation',
      });
    }

    await this.assertBranchInOrganization(branchId, currentUser.organizationId);

    const movement = await this.prisma.cashMovement.create({
      data: {
        organizationId: currentUser.organizationId,
        branchId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description?.trim(),
        status: CashMovementStatus.PENDING,
        createdById: currentUser.sub,
      },
    });

    return this.toResponse(movement);
  }

  async findAll(
    currentUser: TenantUserContext,
    query: ListCashMovementsDto,
  ): Promise<CashMovementResponseDto[]> {
    const roles = await this.getUserRoles(currentUser.sub);
    const isOperator = roles.includes('OPERATOR');
    const where: {
      organizationId: string;
      branchId?: string;
      status?: CashMovementStatus;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = withOrganizationScope(currentUser.organizationId);

    if (query.status) {
      where.status = query.status;
    }

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = from;
      }
      if (to) {
        where.createdAt.lte = to;
      }
    }

    if (isOperator) {
      const branchId = requireUserBranchId(currentUser);

      if (query.branchId && query.branchId !== branchId) {
        throw new ForbiddenException({
          code: ErrorCodes.ACCESS_DENIED,
          message: 'Operators can only access their branch movements',
        });
      }

      where.branchId = branchId;
    } else if (query.branchId) {
      await this.assertBranchInOrganization(
        query.branchId,
        currentUser.organizationId,
      );
      where.branchId = query.branchId;
    }

    const movements = await this.prisma.cashMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return movements.map((movement) => this.toResponse(movement));
  }

  async approve(
    currentUser: TenantUserContext,
    movementId: string,
  ): Promise<CashMovementResponseDto> {
    return this.updateStatus(
      currentUser,
      movementId,
      CashMovementStatus.APPROVED,
    );
  }

  async reject(
    currentUser: TenantUserContext,
    movementId: string,
  ): Promise<CashMovementResponseDto> {
    return this.updateStatus(
      currentUser,
      movementId,
      CashMovementStatus.REJECTED,
    );
  }

  async deliver(
    currentUser: TenantUserContext,
    movementId: string,
  ): Promise<CashMovementResponseDto> {
    const movement = await this.prisma.cashMovement.findFirst({
      where: withOrganizationScope(currentUser.organizationId, {
        id: movementId,
      }),
    });

    if (!movement) {
      throw new NotFoundException({
        code: ErrorCodes.CASH_MOVEMENT_NOT_FOUND,
        message: 'Cash movement not found',
      });
    }

    if (movement.status !== CashMovementStatus.APPROVED) {
      throw new ConflictException({
        code: ErrorCodes.CASH_MOVEMENT_INVALID_STATUS_TRANSITION,
        message: 'Only approved movements can be marked as delivered',
      });
    }

    const updated = await this.prisma.cashMovement.update({
      where: { id: movement.id },
      data: {
        status: CashMovementStatus.DELIVERED,
        approvedById: movement.approvedById ?? currentUser.sub,
        approvedAt: movement.approvedAt ?? new Date(),
      },
    });

    return this.toResponse(updated);
  }

  private async updateStatus(
    currentUser: TenantUserContext,
    movementId: string,
    nextStatus: CashMovementStatus,
  ): Promise<CashMovementResponseDto> {
    const movement = await this.prisma.cashMovement.findFirst({
      where: withOrganizationScope(currentUser.organizationId, {
        id: movementId,
      }),
    });

    if (!movement) {
      throw new NotFoundException({
        code: ErrorCodes.CASH_MOVEMENT_NOT_FOUND,
        message: 'Cash movement not found',
      });
    }

    if (movement.status !== CashMovementStatus.PENDING) {
      throw new ConflictException({
        code: ErrorCodes.CASH_MOVEMENT_INVALID_STATUS_TRANSITION,
        message: 'Only pending movements can be approved or rejected',
      });
    }

    const updated = await this.prisma.cashMovement.update({
      where: { id: movement.id },
      data: {
        status: nextStatus,
        approvedById: currentUser.sub,
        approvedAt: new Date(),
      },
    });

    return this.toResponse(updated);
  }

  private async assertBranchInOrganization(
    branchId: string,
    organizationId: string,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: withOrganizationScope(organizationId, { id: branchId }),
      select: { id: true },
    });

    if (!branch) {
      throw new NotFoundException({
        code: ErrorCodes.BRANCH_NOT_FOUND,
        message: 'Branch not found',
      });
    }
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });

    return userRoles.map((entry) => entry.role.name);
  }

  private toResponse(movement: {
    id: string;
    organizationId: string;
    branchId: string;
    type: CashMovementType;
    amount: { toString: () => string };
    description: string | null;
    status: CashMovementStatus;
    createdById: string;
    approvedById: string | null;
    approvedAt: Date | null;
    createdAt: Date;
  }): CashMovementResponseDto {
    return {
      id: movement.id,
      organizationId: movement.organizationId,
      branchId: movement.branchId,
      type: movement.type,
      amount: movement.amount.toString(),
      description: movement.description,
      status: movement.status,
      createdById: movement.createdById,
      approvedById: movement.approvedById,
      approvedAt: movement.approvedAt,
      createdAt: movement.createdAt,
    };
  }
}
