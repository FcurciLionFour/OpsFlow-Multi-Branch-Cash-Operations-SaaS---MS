import {
  ForbiddenException,
  NotFoundException,
  type INestApplicationContext,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';

type PrismaMock = {
  user: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  role: {
    findMany: jest.Mock;
  };
  userRole: {
    findFirst: jest.Mock;
    deleteMany: jest.Mock;
    createMany: jest.Mock;
  };
};

describe('UsersService', () => {
  let app: INestApplicationContext;
  let service: UsersService;

  const prismaMock: PrismaMock = {
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    userRole: {
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const adminUser = {
    sub: 'admin-user-id',
    organizationId: 'org-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    app = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = app.get(UsersService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('findAll scopes users by organization', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'a@test.com',
        roles: [{ role: { name: 'ADMIN' } }],
      },
    ]);

    const result = await service.findAll(adminUser);

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, organizationId: 'org-1' },
      }),
    );
    expect(result).toEqual([
      { id: 'u1', email: 'a@test.com', roles: ['ADMIN'] },
    ]);
  });

  it('findById denies non-admin access to another user', async () => {
    prismaMock.user.findFirst
      .mockResolvedValueOnce({
        id: 'target-id',
        email: 'target@test.com',
        roles: [],
      })
      .mockResolvedValueOnce({ id: 'target-id' });
    prismaMock.userRole.findFirst.mockResolvedValue(null);

    await expect(
      service.findById('target-id', {
        sub: 'requester',
        organizationId: 'org-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create assigns requester organizationId', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.role.findMany.mockResolvedValue([{ id: 'r1', name: 'ADMIN' }]);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'new@test.com',
      roles: [{ role: { name: 'ADMIN' } }],
    });

    await service.create(
      {
        email: 'new@test.com',
        password: 'Password123',
        roles: ['ADMIN'],
      },
      adminUser,
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const createArgs = prismaMock.user.create.mock.calls[0]?.[0] as {
      data: { organizationId: string };
    };
    expect(createArgs.data.organizationId).toBe('org-1');
  });

  it('update throws not found when user is outside organization', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      service.update('target-id', {}, adminUser),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove soft deletes user within same organization', async () => {
    prismaMock.user.findFirst
      .mockResolvedValueOnce({ id: 'u1' })
      .mockResolvedValueOnce({ id: 'u1' });
    prismaMock.userRole.findFirst.mockResolvedValue({ id: 'admin-role' });

    const result = await service.remove('u1', adminUser);

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isActive: false },
    });
    expect(result).toEqual({ success: true });
  });
});
