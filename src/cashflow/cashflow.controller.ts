import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGlobalGuard } from 'src/auth/guards/jwt-global.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import type { TenantUserContext } from 'src/common/tenant/tenant-scope';
import { CashflowStatsQueryDto } from './dto/cashflow-stats-query.dto';
import { CashflowStatsResponseDto } from './dto/cashflow-stats-response.dto';
import { CashflowStatsService } from './cashflow-stats.service';

@ApiTags('Cashflow')
@ApiBearerAuth()
@Controller('cashflow')
@UseGuards(JwtGlobalGuard, PermissionsGuard)
export class CashflowController {
  constructor(private readonly cashflowStatsService: CashflowStatsService) {}

  @Get('stats')
  @Roles('OPERATOR', 'MANAGER', 'ADMIN')
  @RequirePermissions('cashflow.stats.read')
  @ApiOperation({ summary: 'Cashflow stats scoped by organization' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiOkResponse({ type: CashflowStatsResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  getStats(
    @CurrentUser() currentUser: TenantUserContext,
    @Query() query: CashflowStatsQueryDto,
  ): Promise<CashflowStatsResponseDto> {
    return this.cashflowStatsService.getStats(currentUser, query);
  }
}
