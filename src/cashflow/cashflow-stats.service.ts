import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementStatus, CashMovementType, Prisma } from '@prisma/client';
import { ErrorCodes } from 'src/common/errors/error-codes';
import {
  requireUserBranchId,
  TenantUserContext,
  withOrganizationScope,
} from 'src/common/tenant/tenant-scope';
import { PrismaService } from 'src/prisma/prisma.service';
import { CashflowStatsQueryDto } from './dto/cashflow-stats-query.dto';
import { CashflowStatsResponseDto } from './dto/cashflow-stats-response.dto';

@Injectable()
export class CashflowStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(
    currentUser: TenantUserContext,
    query: CashflowStatsQueryDto,
  ): Promise<CashflowStatsResponseDto> {
    const roles = await this.getUserRoles(currentUser.sub);
    const isOperator = roles.includes('OPERATOR');

    const where: Prisma.CashMovementWhereInput = withOrganizationScope(
      currentUser.organizationId,
    );

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
          message: 'Operators can only access stats for their branch',
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

    const incomeWhere: Prisma.CashMovementWhereInput = {
      ...where,
      status: CashMovementStatus.APPROVED,
      type: CashMovementType.INCOME,
    };
    const expenseWhere: Prisma.CashMovementWhereInput = {
      ...where,
      status: CashMovementStatus.APPROVED,
      type: CashMovementType.EXPENSE,
    };

    const [incomeAgg, expenseAgg, pendingCount] = await Promise.all([
      this.prisma.cashMovement.aggregate({
        where: incomeWhere,
        _sum: { amount: true },
      }),
      this.prisma.cashMovement.aggregate({
        where: expenseWhere,
        _sum: { amount: true },
      }),
      this.prisma.cashMovement.count({
        where: {
          ...where,
          status: CashMovementStatus.PENDING,
        },
      }),
    ]);

    const totalIncomeApproved = incomeAgg._sum.amount ?? new Prisma.Decimal(0);
    const totalExpenseApproved =
      expenseAgg._sum.amount ?? new Prisma.Decimal(0);
    const balance = totalIncomeApproved.minus(totalExpenseApproved);

    return {
      totalIncomeApproved: totalIncomeApproved.toString(),
      totalExpenseApproved: totalExpenseApproved.toString(),
      balance: balance.toString(),
      pendingCount,
    };
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
}
