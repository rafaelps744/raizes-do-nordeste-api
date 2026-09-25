import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AuditoriaService } from '../infrastructure/auditoria/auditoria.service.js';
import { PagamentoMockGateway } from '../infrastructure/pagamento/pagamento-mock.gateway.js';
import { PedidosService } from './pedidos.service.js';
import { FidelidadeService } from './fidelidade.service.js';
import { RegraNegocioError } from '../domain/pedido-regras.js';
import type { JwtPayload } from '../api/auth/jwt-payload.js';

@Injectable()
export class PagamentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PagamentoMockGateway,
    private readonly pedidos: PedidosService,
    private readonly fidelidade: FidelidadeService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async solicitar(
    dto: { pedidoId: number; forcarRecusa?: boolean },
    usuario: JwtPayload,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existente = await this.prisma.pagamento.findUnique({
        where: { idempotencyKey },
      });
      if (existente) {
        const pedido = await this.prisma.pedido.findUnique({
          where: { id: existente.pedidoId },
          include: { itens: true, pagamento: true },
        });
        return {
          idempotente: true,
          pagamento: existente,
          pedido: pedido ? this.pedidos.serializar(pedido) : null,
        };
      }
    }

    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: { itens: true, pagamento: true },
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (pedido.pagamento) {
      throw new RegraNegocioError(
        'PAGAMENTO_JA_REGISTRADO',
        'Já existe um pagamento registrado para este pedido.',
        [{ field: 'pedidoId', issue: 'Pagamento já criado' }],
      );
    }
    if (pedido.status !== 'AGUARDANDO_PAGAMENTO') {
      throw new RegraNegocioError(
        'PEDIDO_NAO_AGUARDA_PAGAMENTO',
        'Somente pedidos aguardando pagamento podem ser cobrados.',
        [{ field: 'pedidoId', issue: `Status atual: ${pedido.status}` }],
      );
    }

    const payloadEnvio = {
      pedidoId: pedido.id,
      valor: Number(pedido.total),
      formaPagamento: 'MOCK',
      canalPedido: pedido.canalPedido,
    };
    const retorno = this.gateway.processar({
      pedidoId: pedido.id,
      valor: Number(pedido.total),
      forcarRecusa: dto.forcarRecusa,
    });

    const resultado = await this.prisma.$transaction(async (tx) => {
      const pagamento = await tx.pagamento.create({
        data: {
          pedidoId: pedido.id,
          status: retorno.aprovado ? 'APROVADO' : 'RECUSADO',
          provedor: 'MOCK',
          idempotencyKey,
          payloadEnvio,
          payloadRetorno: retorno,
        },
      });

      if (retorno.aprovado) {
        await tx.pedido.update({
          where: { id: pedido.id },
          data: { status: 'RECEBIDO' },
        });
      } else {
        await tx.pedido.update({
          where: { id: pedido.id },
          data: { status: 'PAGAMENTO_RECUSADO' },
        });
        await this.pedidos.estornarEstoque(tx, pedido);
      }

      const atualizado = await tx.pedido.findUniqueOrThrow({
        where: { id: pedido.id },
        include: { itens: true, pagamento: true },
      });
      return { pagamento, atualizado };
    });

    if (retorno.aprovado && pedido.clienteId) {
      await this.fidelidade.creditarCompra(
        pedido.clienteId,
        Number(pedido.total),
        pedido.id,
      );
    }

    await this.auditoria.registrar({
      usuarioId: usuario.sub,
      acao: retorno.aprovado ? 'PAGAMENTO_APROVADO' : 'PAGAMENTO_RECUSADO',
      recurso: 'pagamentos',
      recursoId: String(resultado.pagamento.id),
      detalhes: retorno,
    });

    return {
      idempotente: false,
      pagamento: {
        id: resultado.pagamento.id,
        status: resultado.pagamento.status,
        provedor: resultado.pagamento.provedor,
        payloadEnvio,
        payloadRetorno: retorno,
      },
      pedido: this.pedidos.serializar(resultado.atualizado),
    };
  }
}
