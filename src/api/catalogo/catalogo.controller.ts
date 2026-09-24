import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UnidadesService } from '../../application/unidades.service.js';
import { ProdutosService } from '../../application/produtos.service.js';
import { Publico } from '../auth/auth.decorators.js';

@ApiTags('unidades')
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidades: UnidadesService) {}

  @Publico()
  @Get()
  @ApiOperation({ summary: 'Listar unidades da rede' })
  listar() {
    return this.unidades.listar();
  }

  @Publico()
  @Get(':id')
  @ApiOperation({ summary: 'Obter unidade por id' })
  obter(@Param('id', ParseIntPipe) id: number) {
    return this.unidades.obter(id);
  }
}

@ApiTags('produtos')
@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtos: ProdutosService) {}

  @Publico()
  @Get()
  @ApiOperation({ summary: 'Listar produtos (cardápio por unidade opcional)' })
  listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unidadeId') unidadeId?: string,
  ) {
    return this.produtos.listar(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      unidadeId ? Number(unidadeId) : undefined,
    );
  }

  @Publico()
  @Get(':id')
  obter(@Param('id', ParseIntPipe) id: number) {
    return this.produtos.obter(id);
  }
}
