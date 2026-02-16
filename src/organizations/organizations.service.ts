import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    const slug = (dto.slug ?? dto.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    try {
      const organization = await this.prisma.organization.create({
        data: {
          name: dto.name.trim(),
          slug,
        },
      });

      return organization;
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'ORGANIZATION_SLUG_ALREADY_EXISTS',
          message: 'Organization slug already exists',
        });
      }

      throw error;
    }
  }

  async findAllForOrganization(
    organizationId: string,
  ): Promise<OrganizationResponseDto[]> {
    return this.prisma.organization.findMany({
      where: { id: organizationId },
      orderBy: { createdAt: 'desc' },
    });
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
