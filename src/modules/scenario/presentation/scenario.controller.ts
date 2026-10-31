import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateScenarioDto } from '../application/dto/create-scenario.dto';
import { UpdateScenarioDto } from '../application/dto/update-scenario.dto';
import { ScenarioService } from '../application/scenario.service';
import { ScenarioStatus } from 'src/common/enums';
import { ScenarioResponse } from '../application/dto/scenario.response';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('Scenarios')
@Controller('scenarios')
export class ScenarioController {
    constructor(private readonly service: ScenarioService) { }

    @RequirePermission('scenarios.read')
    @Get()
    @ApiOperation({ summary: 'List all scenarios' })
    @ApiQuery({ name: 'status', enum: ScenarioStatus, required: false })
    @ApiResponse({ status: 200, type: [ScenarioResponse] })
    async findAll(@Query('status') status?: ScenarioStatus): Promise<ScenarioResponse[]> {
        const entities = await this.service.findAll(status);
        return entities.map(ScenarioResponse.fromEntity);
    }

    @RequirePermission('scenarios.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get scenario by ID' })
    @ApiResponse({ status: 200, type: ScenarioResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ScenarioResponse> {
        const entity = await this.service.findOne(id);
        return ScenarioResponse.fromEntity(entity);
    }

    @RequirePermission('scenarios.write')
    @Post()
    @ApiOperation({ summary: 'Create scenario' })
    @ApiResponse({ status: 201, type: ScenarioResponse })
    async create(@Body() dto: CreateScenarioDto): Promise<ScenarioResponse> {
        const entity = await this.service.create(dto);
        return ScenarioResponse.fromEntity(entity);
    }

    @RequirePermission('scenarios.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update scenario' })
    @ApiResponse({ status: 200, type: ScenarioResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateScenarioDto,
    ): Promise<ScenarioResponse> {
        const entity = await this.service.update(id, dto);
        return ScenarioResponse.fromEntity(entity);
    }

    @RequirePermission('scenarios.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete scenario' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @RequirePermission('scenarios.write')
    @Patch(':id/archive')
    @ApiOperation({ summary: 'Archive scenario' })
    @ApiResponse({ status: 200, type: ScenarioResponse })
    async archive(@Param('id', ParseUUIDPipe) id: string): Promise<ScenarioResponse> {
        const entity = await this.service.archive(id);
        return ScenarioResponse.fromEntity(entity);
    }

    @RequirePermission('scenarios.write')
    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activate scenario' })
    @ApiResponse({ status: 200, type: ScenarioResponse })
    async activate(@Param('id', ParseUUIDPipe) id: string): Promise<ScenarioResponse> {
        const entity = await this.service.activate(id);
        return ScenarioResponse.fromEntity(entity);
    }
}