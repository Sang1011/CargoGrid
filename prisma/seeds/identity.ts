import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { ALL_PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS } from '../../src/common/security/permissions';

/**
 * Idempotent: safe to run on every seed. Permissions and role grants are synced to
 * src/common/security/permissions.ts; users are created only if missing.
 */
export async function seedIdentity(prisma: PrismaClient): Promise<void> {
  for (const code of ALL_PERMISSIONS) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }
  const permissions = await prisma.permission.findMany();
  const permissionId = new Map(permissions.map(p => [p.code, p.id]));

  for (const [name, codes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: ROLE_DESCRIPTIONS[name] },
      create: { name, description: ROLE_DESCRIPTIONS[name] },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: [...new Set(codes)].map(code => ({ roleId: role.id, permissionId: permissionId.get(code)! })),
    });
  }

  const password = process.env.SEED_USER_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);
  const roles = await prisma.role.findMany();

  // One demo account per role, so every permission boundary can be tried from Swagger.
  for (const role of roles) {
    const email = role.name === 'admin' ? (process.env.SEED_ADMIN_EMAIL ?? 'admin@cargogrid.local') : `${role.name}@cargogrid.local`;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: role.name.replace(/_/g, ' '),
        roles: { create: [{ roleId: role.id }] },
      },
    });
  }
}
