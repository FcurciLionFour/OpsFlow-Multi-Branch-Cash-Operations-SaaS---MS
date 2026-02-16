import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentOrgId } from 'src/auth/decorators/current-org-id.decorator';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGlobalGuard } from 'src/auth/guards/jwt-global.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { BranchResponseDto } from './dto/branch-response.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { BranchesService } from './branches.service';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
@UseGuards(JwtGlobalGuard, PermissionsGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles('ADMIN')
  @RequirePermissions('branches.write')
  @ApiOperation({ summary: 'Create branch in current organization (ADMIN)' })
  @ApiOkResponse({ type: BranchResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  create(
    @CurrentOrgId() organizationId: string,
    @Body() dto: CreateBranchDto,
  ): Promise<BranchResponseDto> {
    return this.branchesService.create(organizationId, dto);
  }

  @Get()
  @RequirePermissions('branches.read')
  @ApiOperation({ summary: 'List branches in current organization' })
  @ApiOkResponse({ type: BranchResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  findAll(
    @CurrentOrgId() organizationId: string,
  ): Promise<BranchResponseDto[]> {
    return this.branchesService.findAll(organizationId);
  }
}
