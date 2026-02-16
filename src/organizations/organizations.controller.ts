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
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGlobalGuard } from 'src/auth/guards/jwt-global.guard';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { ErrorResponseDto } from 'src/common/dto/error-response.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtGlobalGuard, PermissionsGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create organization (admin only)' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  @ApiForbiddenResponse({ type: ErrorResponseDto })
  create(@Body() dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List current organization context' })
  @ApiOkResponse({ type: OrganizationResponseDto, isArray: true })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  findAll(
    @CurrentOrgId() organizationId: string,
  ): Promise<OrganizationResponseDto[]> {
    return this.organizationsService.findAllForOrganization(organizationId);
  }
}
