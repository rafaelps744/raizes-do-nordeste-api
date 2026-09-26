import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { Perfis } from '../auth/auth.decorators.js';

@ApiTags('auditoria')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Perfis('GERENTE', 'ADMIN')
  @ApiOperation({ summary: 'Listar logs de ações sensíveis' })
  listar(@Query('limit') limit?: string) {
    return this.prisma.logAuditoria.findMany({
      take: limit ? Number(limit) : 20,
      orderBy: { createdAt: 'desc' },
    });
  }
}
