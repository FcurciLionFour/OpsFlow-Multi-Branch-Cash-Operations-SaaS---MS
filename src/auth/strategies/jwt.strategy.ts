import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { ErrorCodes } from 'src/common/errors/error-codes';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.organizationId) {
      return {
        sub: payload.sub,
        sid: payload.sid,
        organizationId: payload.organizationId,
        branchId: payload.branchId,
      };
    }

    // Transitional fallback for legacy tokens created before org claims existed.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        isActive: true,
        organizationId: true,
        branchId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_USER_INACTIVE,
        message: 'Unauthorized',
      });
    }

    return {
      sub: payload.sub,
      sid: payload.sid,
      organizationId: user.organizationId,
      branchId: user.branchId,
    };
  }
}

interface JwtPayload {
  sub: string;
  sid?: string;
  organizationId?: string;
  branchId?: string;
}
