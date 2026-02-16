import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { withOrganizationScope } from 'src/common/tenant/tenant-scope';
import { BranchResponseDto } from './dto/branch-response.dto';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    dto: CreateBranchDto,
  ): Promise<BranchResponseDto> {
    try {
      const branch = await this.prisma.branch.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          code: dto.code?.trim(),
          cashLimit: dto.cashLimit,
        },
      });

      return {
        ...branch,
        cashLimit: branch.cashLimit?.toString() ?? null,
      };
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'BRANCH_ALREADY_EXISTS',
          message: 'Branch name already exists in this organization',
        });
      }

      throw error;
    }
  }

  async findAll(organizationId: string): Promise<BranchResponseDto[]> {
    const branches = await this.prisma.branch.findMany({
      where: withOrganizationScope(organizationId),
      orderBy: { createdAt: 'desc' },
    });

    return branches.map((branch) => ({
      ...branch,
      cashLimit: branch.cashLimit?.toString() ?? null,
    }));
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}
