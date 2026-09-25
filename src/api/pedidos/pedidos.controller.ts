import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PedidosService } from '../../application/pedidos.service.js';
import { Perfis } from '../auth/auth.decorators.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { AtualizarStatusDto, CriarPedidoDto } from './dto/pedido.dto.js';

@ApiTags('pedidos')
@ApiBearerAuth()
@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidos: PedidosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar pedido validando estoque e canalPedido' })
  criar(
    @Body() dto: CriarPedidoDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.pedidos.criar(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pedidos com filtro por canal e status' })
  listar(
    @Req() req: Request & { user: JwtPayload },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('canalPedido') canalPedido?: string,
    @Query('status') status?: string,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.pedidos.listar(
      {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        canalPedido,
        status,
        unidadeId: unidadeId ? Number(unidadeId) : undefined,
      },
      req.user,
    );
  }

  @Get(':id')
  obter(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.pedidos.obter(id, req.user);
  }

  @Patch(':id/status')
  @Perfis('ATENDENTE', 'COZINHA', 'GERENTE', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar status operacional do pedido' })
  status(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarStatusDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.pedidos.atualizarStatus(id, dto.status, req.user);
  }

  @Post(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar pedido e estornar estoque' })
  cancelar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.pedidos.atualizarStatus(id, 'CANCELADO', req.user);
  }
}
