import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PagamentosService } from '../../application/pagamentos.service.js';
import type { JwtPayload } from '../auth/jwt-payload.js';
import { SolicitarPagamentoDto } from './dto/solicitar-pagamento.dto.js';

@ApiTags('pagamentos')
@ApiBearerAuth()
@Controller('pagamentos')
export class PagamentosController {
  constructor(private readonly pagamentos: PagamentosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Solicitar pagamento mock e atualizar status do pedido' })
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  solicitar(
    @Body() dto: SolicitarPagamentoDto,
    @Req() req: Request & { user: JwtPayload },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.pagamentos.solicitar(dto, req.user, idempotencyKey);
  }
}
