import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAudit, RequirePermission } from 'src/common/security/decorators';
import type { AppRequest } from 'src/common/security/types';
import { AllocationView } from '../application/allocation.response';
import { Actor, AllocationService } from '../application/allocation.service';
import { AllocationQueryDto, EditAllocationDto, ProposeAllocationDto, RejectAllocationDto } from '../application/dto/allocation.dto';

const actor = (req: AppRequest): Actor => ({
    actorId: req.user?.id ?? null,
    actorEmail: req.user?.email ?? null,
    correlationId: req.correlationId ?? null,
});

// Each action writes its own audit row inside its transaction, so the generic interceptor is off.
@ApiTags('Allocations')
@Controller('allocations')
@NoAudit()
export class AllocationController {
    constructor(private readonly allocations: AllocationService) { }

    @Post('propose')
    @RequirePermission('allocation.run')
    @ApiOperation({
        summary: 'Propose where every cargo item of a lot should go',
        description: 'Runs the chosen algorithm on the real cargo of an inbound shipment or transfer order. Nothing moves until the proposal is confirmed.',
    })
    propose(@Body() dto: ProposeAllocationDto, @Req() req: AppRequest): Promise<AllocationView> {
        return this.allocations.propose(dto, actor(req));
    }

    @Get()
    @RequirePermission('allocation.read')
    list(@Query() query: AllocationQueryDto) {
        return this.allocations.list(query);
    }

    @Get(':id')
    @RequirePermission('allocation.read')
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AllocationView> {
        return this.allocations.findOne(id);
    }

    @Patch(':id')
    @RequirePermission('allocation.run')
    @ApiOperation({ summary: 'Change the slot of some items; the whole plan is re-checked against the hard constraints' })
    edit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EditAllocationDto, @Req() req: AppRequest): Promise<AllocationView> {
        return this.allocations.edit(id, dto, actor(req));
    }

    @Post(':id/confirm')
    @HttpCode(HttpStatus.OK)
    @RequirePermission('allocation.confirm')
    @ApiOperation({
        summary: 'Approve the plan: create and reserve one movement per cargo item, all or nothing',
        description: '422 if any item has no slot or the plan no longer fits; 409 if the lot changed or the proposal is already closed.',
    })
    confirm(@Param('id', ParseUUIDPipe) id: string, @Req() req: AppRequest): Promise<AllocationView> {
        return this.allocations.confirm(id, actor(req));
    }

    @Post(':id/reject')
    @HttpCode(HttpStatus.OK)
    @RequirePermission('allocation.confirm')
    reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectAllocationDto, @Req() req: AppRequest): Promise<AllocationView> {
        return this.allocations.reject(id, dto.reason, actor(req));
    }
}
