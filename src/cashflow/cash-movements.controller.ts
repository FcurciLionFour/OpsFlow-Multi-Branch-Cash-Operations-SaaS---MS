import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import { CashMovementResponseDto } from './dto/cash-movement-response.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { ListCashMovementsDto } from './dto/list-cash-movements.dto';
import { CashMovementsService } from './cash-movements.service';

@ApiTags('Cash Movements')
@ApiBearerAuth()
@Controller('cash-movements')
@UseGuards(JwtGlobalGuard, PermissionsGuard)
export class CashMovementsController {
  constructor(private readonly cashMovementsService: CashMovementsService) {}

  @Post()
  @Roles('OPERATOR', 'ADMIN')
  @RequirePermissions('cashMovements.create')
  @ApiOperation({ summary: 'Create cash movement with status PENDING' })
  @ApiOkResponse({ type: CashMovementResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  create(
    @CurrentUser() currentUser: TenantUserContext,
    @Body() dto: CreateCashMovementDto,
  ): Promise<CashMovementResponseDto> {
    return this.cashMovementsService.create(currentUser, dto);
  }

  @Get()
  @Roles('OPERATOR', 'MANAGER', 'ADMIN')
  @RequirePermissions('cashMovements.read')
  @ApiOperation({ summary: 'List cash movements scoped by organization' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'DELIVERED'],
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiOkResponse({ type: CashMovementResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  findAll(
    @CurrentUser() currentUser: TenantUserContext,
    @Query() query: ListCashMovementsDto,
  ): Promise<CashMovementResponseDto[]> {
    return this.cashMovementsService.findAll(currentUser, query);
  }

  @Patch(':id/approve')
  @Roles('MANAGER', 'ADMIN')
  @RequirePermissions('cashMovements.approve')
  @ApiOperation({ summary: 'Approve pending cash movement' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: CashMovementResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  approve(
    @CurrentUser() currentUser: TenantUserContext,
    @Param('id') id: string,
  ): Promise<CashMovementResponseDto> {
    return this.cashMovementsService.approve(currentUser, id);
  }

  @Patch(':id/reject')
  @Roles('MANAGER', 'ADMIN')
  @RequirePermissions('cashMovements.approve')
  @ApiOperation({ summary: 'Reject pending cash movement' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: CashMovementResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  reject(
    @CurrentUser() currentUser: TenantUserContext,
    @Param('id') id: string,
  ): Promise<CashMovementResponseDto> {
    return this.cashMovementsService.reject(currentUser, id);
  }

  @Patch(':id/deliver')
  @Roles('MANAGER', 'ADMIN')
  @RequirePermissions('cashMovements.deliver')
  @ApiOperation({ summary: 'Mark approved movement as delivered' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: CashMovementResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  deliver(
    @CurrentUser() currentUser: TenantUserContext,
    @Param('id') id: string,
  ): Promise<CashMovementResponseDto> {
    return this.cashMovementsService.deliver(currentUser, id);
  }
}
