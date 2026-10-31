import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OptimizationService } from '../application/optimization.service';
import { RunOptimizationDto } from '../application/dto/run-optimization.dto';
import { CompareOptimizationDto } from '../application/dto/compare-optimization.dto';
import { OptimizationRunResponse } from '../application/dto/optimization-run.response';
import { AssignmentResponse } from '../application/dto/assignment.response';
import { AlgorithmType, OptimizationContextType } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('Optimization')
@Controller('optimization')
export class OptimizationController {
    constructor(private readonly service: OptimizationService) {}

    @RequirePermission('allocation.run')
    @Post('run')
    @ApiOperation({ summary: 'Run a single optimization algorithm' })
    @ApiResponse({ status: 201, type: OptimizationRunResponse })
    async run(@Body() dto: RunOptimizationDto): Promise<OptimizationRunResponse> {
        const entity = await this.service.run(dto);
        return OptimizationRunResponse.fromEntity(entity);
    }

    @RequirePermission('allocation.run')
    @Post('compare')
    @ApiOperation({ summary: 'Compare multiple optimization algorithms' })
    @ApiResponse({ status: 201, type: [OptimizationRunResponse] })
    async compare(@Body() dto: CompareOptimizationDto): Promise<OptimizationRunResponse[]> {
        const entities = await this.service.compare(dto);
        return entities.map(OptimizationRunResponse.fromEntity);
    }

    @RequirePermission('allocation.read')
    @Get('runs')
    @ApiOperation({ summary: 'List optimization runs by scenario' })
    @ApiQuery({ name: 'scenarioId', required: true })
    @ApiQuery({ name: 'algorithm', enum: AlgorithmType, required: false })
    @ApiQuery({ name: 'contextType', enum: OptimizationContextType, required: false })
    @ApiResponse({ status: 200, type: [OptimizationRunResponse] })
    async findByScenario(
        @Query('scenarioId', ParseUUIDPipe) scenarioId: string,
        @Query('algorithm') algorithm?: AlgorithmType,
        @Query('contextType') contextType?: OptimizationContextType,
    ): Promise<OptimizationRunResponse[]> {
        const entities = await this.service.findByScenario(scenarioId, { algorithm, contextType });
        return entities.map(OptimizationRunResponse.fromEntity);
    }

    @RequirePermission('allocation.read')
    @Get('runs/:id')
    @ApiOperation({ summary: 'Get optimization run detail with assignments' })
    @ApiResponse({ status: 200 })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<{
        run: OptimizationRunResponse;
        assignments: AssignmentResponse[];
    }> {
        const result = await this.service.findOne(id);
        return {
            run: OptimizationRunResponse.fromEntity(result.run),
            assignments: result.assignments.map((a: any) => AssignmentResponse.fromEntity(a)),
        };
    }
}
