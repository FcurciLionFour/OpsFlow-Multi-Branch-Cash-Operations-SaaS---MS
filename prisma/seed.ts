import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular user',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: {
      name: 'MANAGER',
      description: 'Organization manager',
    },
  });

  const operatorRole = await prisma.role.upsert({
    where: { name: 'OPERATOR' },
    update: {},
    create: {
      name: 'OPERATOR',
      description: 'Branch operator',
    },
  });

  const usersRead = await prisma.permission.upsert({
    where: { key: 'users.read' },
    update: {},
    create: {
      key: 'users.read',
      description: 'Read users',
    },
  });

  const usersWrite = await prisma.permission.upsert({
    where: { key: 'users.write' },
    update: {},
    create: {
      key: 'users.write',
      description: 'Write users',
    },
  });

  const branchesRead = await prisma.permission.upsert({
    where: { key: 'branches.read' },
    update: {},
    create: {
      key: 'branches.read',
      description: 'Read branches',
    },
  });

  const branchesWrite = await prisma.permission.upsert({
    where: { key: 'branches.write' },
    update: {},
    create: {
      key: 'branches.write',
      description: 'Write branches',
    },
  });

  const cashMovementsCreate = await prisma.permission.upsert({
    where: { key: 'cashMovements.create' },
    update: {},
    create: {
      key: 'cashMovements.create',
      description: 'Create cash movements',
    },
  });

  const cashMovementsRead = await prisma.permission.upsert({
    where: { key: 'cashMovements.read' },
    update: {},
    create: {
      key: 'cashMovements.read',
      description: 'Read cash movements',
    },
  });

  const cashMovementsApprove = await prisma.permission.upsert({
    where: { key: 'cashMovements.approve' },
    update: {},
    create: {
      key: 'cashMovements.approve',
      description: 'Approve or reject cash movements',
    },
  });

  const cashMovementsDeliver = await prisma.permission.upsert({
    where: { key: 'cashMovements.deliver' },
    update: {},
    create: {
      key: 'cashMovements.deliver',
      description: 'Mark cash movements as delivered',
    },
  });

  const cashflowStatsRead = await prisma.permission.upsert({
    where: { key: 'cashflow.stats.read' },
    update: {},
    create: {
      key: 'cashflow.stats.read',
      description: 'Read cashflow stats',
    },
  });

  async function ensureRolePermission(roleId: string, permissionId: string) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId,
        permissionId,
      },
    });
  }

  const adminPermissionIds = [
    usersRead.id,
    usersWrite.id,
    branchesRead.id,
    branchesWrite.id,
    cashMovementsCreate.id,
    cashMovementsRead.id,
    cashMovementsApprove.id,
    cashMovementsDeliver.id,
    cashflowStatsRead.id,
  ];
  for (const permissionId of adminPermissionIds) {
    await ensureRolePermission(adminRole.id, permissionId);
  }

  const managerPermissionIds = [
    branchesRead.id,
    cashMovementsRead.id,
    cashMovementsApprove.id,
    cashMovementsDeliver.id,
    cashflowStatsRead.id,
  ];
  for (const permissionId of managerPermissionIds) {
    await ensureRolePermission(managerRole.id, permissionId);
  }

  const operatorPermissionIds = [
    cashMovementsCreate.id,
    cashMovementsRead.id,
    cashflowStatsRead.id,
  ];
  for (const permissionId of operatorPermissionIds) {
    await ensureRolePermission(operatorRole.id, permissionId);
  }

  // Keep USER role with least privilege by default.
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: userRole.id,
      permissionId: usersRead.id,
    },
  });

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!seedAdminEmail) {
    console.log(
      'SEED_ADMIN_EMAIL not set, skipping automatic ADMIN role assignment.',
    );
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: seedAdminEmail },
  });

  if (!user) {
    console.warn(
      `SEED_ADMIN_EMAIL=${seedAdminEmail} does not exist. Skipping ADMIN role assignment.`,
    );
    return;
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: adminRole.id,
    },
  });

  console.log(`Assigned ADMIN role to ${seedAdminEmail}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
