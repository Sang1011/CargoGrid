import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PageQueryDto } from '../pagination/page-query.dto';
import { RequirePermission } from '../security/decorators';
import { AuditService } from './audit.service';

export class AuditQueryDto extends PageQueryDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) entityType?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) entityId?: string;
    @ApiPropertyOptional() @IsOptional() @IsUUID() actorId?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) correlationId?: string;
    @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
    @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

/** Read-only on purpose: there is no route to change or delete an audit row. */
@ApiTags('Audit')
@Controller('audit-logs')
export class AuditController {
    constructor(private readonly audit: AuditService) { }

    @Get()
    @RequirePermission('audit.read')
    @ApiOperation({ summary: 'Search the audit trail (newest first)' })
    list(@Query() query: AuditQueryDto) {
        return this.audit.list(query);
    }
}
