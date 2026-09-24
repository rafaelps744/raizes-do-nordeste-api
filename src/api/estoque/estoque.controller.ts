import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { EstoqueService } from '../../application/estoque.service.js';
import { Perfis } from '../auth/auth.decorators.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { MovimentarEstoqueDto } from './dto/movimentar-estoque.dto.js';

@ApiTags('estoque')
@ApiBearerAuth()
@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar saldo de estoque por unidade' })
  consultar(@Query('unidadeId', ParseIntPipe) unidadeId: number) {
    return this.estoque.consultar(unidadeId);
  }

  @Post('movimentacoes')
  @Perfis('GERENTE', 'ADMIN', 'ATENDENTE')
  @ApiOperation({ summary: 'Registrar entrada ou saída de estoque' })
  movimentar(
    @Body() dto: MovimentarEstoqueDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.estoque.movimentar({ ...dto, usuarioId: req.user.sub });
  }
}
