import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from 'src/prisma/prisma.service';

describe('JwtStrategy', () => {
  it('maps payload to request user shape', async () => {
    const config = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as ConfigService;

    const prisma = {} as PrismaService;
    const strategy = new JwtStrategy(config, prisma);

    await expect(
      strategy.validate({ sub: 'user-1', organizationId: 'org-1' }),
    ).resolves.toEqual({
      sub: 'user-1',
      sid: undefined,
      organizationId: 'org-1',
      branchId: undefined,
    });
  });
});
