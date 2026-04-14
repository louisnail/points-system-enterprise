import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('部门管理')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: '部门列表' })
  async findAll() {
    return this.departmentService.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: '部门树' })
  async getTree() {
    return this.departmentService.getTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '部门详情' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.findOne(id);
  }

  @Get(':id/employees')
  @ApiOperation({ summary: '部门员工列表' })
  async getEmployees(
    @Param('id', ParseIntPipe) id: number,
    @Query('keyword') keyword?: string,
    @Query('companyBelong') companyBelong?: string,
  ) {
    return this.departmentService.getEmployees(id, { keyword, companyBelong });
  }

  @Post()
  @Roles('super_admin')
  @ApiOperation({ summary: '新增部门' })
  async create(@Body() dto: any) {
    return this.departmentService.create(dto);
  }

  @Put('sort')
  @Roles('super_admin')
  @ApiOperation({ summary: '批量排序部门' })
  async batchSort(@Body() items: { id: number; sortOrder: number; parentId?: number }[]) {
    return this.departmentService.batchSort(items);
  }

  @Put(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '编辑部门' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.departmentService.update(id, dto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: '删除部门' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.departmentService.remove(id);
  }
}
