import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { ErrorCodes } from 'src/common/errors/error-codes';
import {
  TenantUserContext,
  withOrganizationScope,
} from 'src/common/tenant/tenant-scope';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(currentUser: TenantUserContext): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      where: withOrganizationScope(currentUser.organizationId, {
        isActive: true,
      }),
      select: {
        id: true,
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      roles: u.roles.map((ur) => ur.role.name),
    }));
  }

  async findById(
    id: string,
    currentUser: TenantUserContext,
  ): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findFirst({
      where: withOrganizationScope(currentUser.organizationId, { id }),
      select: {
        id: true,
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    await this.assertCanAccessUser(user.id, currentUser);

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }

  async create(data: CreateUserDto, currentUser: TenantUserContext) {
    const exists = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (exists) {
      throw new ForbiddenException({
        code: ErrorCodes.USER_ALREADY_EXISTS,
        message: 'User already exists',
      });
    }

    if (!data.roles || data.roles.length === 0) {
      throw new ForbiddenException({
        code: ErrorCodes.USER_ROLE_REQUIRED,
        message: 'At least one role is required',
      });
    }

    const roles = await this.prisma.role.findMany({
      where: {
        name: {
          in: data.roles,
        },
      },
    });

    if (roles.length !== data.roles.length) {
      throw new ForbiddenException({
        code: ErrorCodes.USER_INVALID_ROLE,
        message: 'One or more roles are invalid',
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        isActive: true,
        organizationId: currentUser.organizationId,
        roles: {
          create: roles.map((role) => ({
            role: {
              connect: { id: role.id },
            },
          })),
        },
      },
      select: {
        id: true,
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((ur) => ur.role.name),
    };
  }

  async update(
    id: string,
    data: UpdateUserDto,
    currentUser: TenantUserContext,
  ) {
    await this.assertCanAccessUser(id, currentUser);

    const user = await this.prisma.user.findFirst({
      where: withOrganizationScope(currentUser.organizationId, { id }),
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const { roles, ...userData } = data;

    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id },
        data: userData,
      });
    }

    if (roles) {
      if (roles.length === 0) {
        throw new ForbiddenException({
          code: ErrorCodes.USER_ROLE_REQUIRED,
          message: 'User must have at least one role',
        });
      }

      const dbRoles = await this.prisma.role.findMany({
        where: {
          name: { in: roles },
        },
      });

      if (dbRoles.length !== roles.length) {
        throw new ForbiddenException({
          code: ErrorCodes.USER_INVALID_ROLE,
          message: 'One or more roles are invalid',
        });
      }

      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });

      await this.prisma.userRole.createMany({
        data: dbRoles.map((role) => ({
          userId: id,
          roleId: role.id,
        })),
      });
    }

    const updated = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        isActive: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      id: updated!.id,
      email: updated!.email,
      isActive: updated!.isActive,
      roles: updated!.roles.map((ur) => ur.role.name),
    };
  }

  async remove(id: string, currentUser: TenantUserContext) {
    await this.assertCanAccessUser(id, currentUser);

    const user = await this.prisma.user.findFirst({
      where: withOrganizationScope(currentUser.organizationId, { id }),
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return { success: true };
  }

  private async assertCanAccessUser(
    targetUserId: string,
    requester: TenantUserContext,
  ): Promise<void> {
    const target = await this.prisma.user.findFirst({
      where: withOrganizationScope(requester.organizationId, {
        id: targetUserId,
      }),
      select: { id: true },
    });

    if (!target) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }

    const isAdmin = await this.prisma.userRole.findFirst({
      where: {
        userId: requester.sub,
        role: {
          name: 'ADMIN',
        },
      },
    });

    if (isAdmin) {
      return;
    }

    if (targetUserId === requester.sub) {
      return;
    }

    throw new ForbiddenException({
      code: ErrorCodes.ACCESS_DENIED,
      message: 'Access denied',
    });
  }
}
