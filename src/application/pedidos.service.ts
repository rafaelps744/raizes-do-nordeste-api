import { Injectable, NotFoundException } from '@nestjs/common';
import type { CanalPedido, Prisma, StatusPedido } from '@prisma/client';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AuditoriaService } from '../infrastructure/auditoria/auditoria.service.js';
import {
  aplicarDescontoPercentual,
  calcularSubtotal,
  RegraNegocioError,
  validarCanalPedido,
  validarTransicao,
} from '../domain/pedido-regras.js';
import type { StatusPedido as StatusPedidoDominio } from '../domain/enums.js';
import type { JwtPayload } from '../api/auth/jwt-payload.js';

@Injectable()
export class PedidosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async criar(
    dto: {
      unidadeId: number;
      canalPedido: string;
      clienteId?: number;
      itens: Array<{ produtoId: number; quantidade: number }>;
      codigoPromocional?: string;
    },
    usuario: JwtPayload,
  ) {
    const canalPedido = validarCanalPedido(dto.canalPedido);
    if (!dto.itens?.length) {
      throw new RegraNegocioError(
        'ITENS_OBRIGATORIOS',
        'Informe ao menos um item no pedido.',
        [{ field: 'itens', issue: 'Lista vazia' }],
        422,
      );
    }

    const unidade = await this.prisma.unidade.findUnique({
      where: { id: dto.unidadeId },
    });
    if (!unidade) throw new NotFoundException('Unidade não encontrada.');

    const clienteId =
      usuario.perfil === 'CLIENTE' ? usuario.sub : (dto.clienteId ?? usuario.sub);

    const pedido = await this.prisma.$transaction(async (tx) => {
      const itensCalculados = [];
      for (const [index, item] of dto.itens.entries()) {
        if (item.quantidade <= 0) {
          throw new RegraNegocioError(
            'QUANTIDADE_INVALIDA',
            'Quantidade deve ser maior que zero.',
            [
              {
                field: `itens[${index}].quantidade`,
                issue: 'Deve ser positiva',
              },
            ],
            422,
          );
        }

        const produto = await tx.produto.findUnique({
          where: { id: item.produtoId },
        });
        if (!produto || !produto.ativo) {
          throw new NotFoundException(
            `Produto ${item.produtoId} não encontrado.`,
          );
        }

        const cardapio = await tx.cardapioUnidade.findUnique({
          where: {
            unidadeId_produtoId: {
              unidadeId: dto.unidadeId,
              produtoId: item.produtoId,
            },
          },
        });
        if (!cardapio?.disponivel) {
          throw new NotFoundException(
            `Produto ${item.produtoId} indisponível nesta unidade.`,
          );
        }

        const estoque = await tx.estoque.findUnique({
          where: {
            unidadeId_produtoId: {
              unidadeId: dto.unidadeId,
              produtoId: item.produtoId,
            },
          },
        });
        if (!estoque || estoque.quantidade < item.quantidade) {
          throw new RegraNegocioError(
            'ESTOQUE_INSUFICIENTE',
            'Não há quantidade suficiente para um ou mais itens.',
            [
              {
                field: `itens[${index}].quantidade`,
                issue: `Disponível: ${estoque?.quantidade ?? 0}`,
              },
            ],
          );
        }

        await tx.estoque.update({
          where: { id: estoque.id },
          data: { quantidade: estoque.quantidade - item.quantidade },
        });
        await tx.movimentacaoEstoque.create({
          data: {
            estoqueId: estoque.id,
            tipo: 'SAIDA',
            quantidade: item.quantidade,
            motivo: `Reserva pedido`,
            usuarioId: usuario.sub,
          },
        });

        itensCalculados.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: Number(produto.preco),
        });
      }

      let total = calcularSubtotal(itensCalculados);
      let desconto = 0;
      if (dto.codigoPromocional) {
        const promo = await tx.promocao.findUnique({
          where: { codigo: dto.codigoPromocional.toUpperCase() },
        });
        if (promo?.ativa) {
          const aplicado = aplicarDescontoPercentual(total, promo.percentual);
          desconto = aplicado.desconto;
          total = aplicado.totalFinal;
        }
      }

      return tx.pedido.create({
        data: {
          clienteId,
          unidadeId: dto.unidadeId,
          canalPedido: canalPedido as CanalPedido,
          status: 'AGUARDANDO_PAGAMENTO',
          total,
          desconto,
          codigoPromocional: dto.codigoPromocional?.toUpperCase(),
          itens: { create: itensCalculados },
        },
        include: { itens: true },
      });
    });

    await this.auditoria.registrar({
      usuarioId: usuario.sub,
      acao: 'CRIAR_PEDIDO',
      recurso: 'pedidos',
      recursoId: String(pedido.id),
      detalhes: {
        canalPedido,
        unidadeId: dto.unidadeId,
        total: Number(pedido.total),
      },
    });

    return this.serializar(pedido);
  }

  async listar(query: {
    page?: number;
    limit?: number;
    canalPedido?: string;
    status?: string;
    unidadeId?: number;
  }, usuario: JwtPayload) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.PedidoWhereInput = {};
    if (query.canalPedido) {
      where.canalPedido = validarCanalPedido(query.canalPedido) as CanalPedido;
    }
    if (query.status) where.status = query.status as StatusPedido;
    if (query.unidadeId) where.unidadeId = query.unidadeId;
    if (usuario.perfil === 'CLIENTE') where.clienteId = usuario.sub;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pedido.findMany({
        where,
        include: { itens: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.pedido.count({ where }),
    ]);

    return {
      data: data.map((p) => this.serializar(p)),
      page,
      limit,
      total,
    };
  }

  async obter(id: number, usuario: JwtPayload) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: { itens: true, pagamento: true },
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (usuario.perfil === 'CLIENTE' && pedido.clienteId !== usuario.sub) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    return this.serializar(pedido);
  }

  async atualizarStatus(
    id: number,
    status: StatusPedidoDominio,
    usuario: JwtPayload,
  ) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: { itens: true },
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    validarTransicao(
      pedido.status as StatusPedidoDominio,
      status,
    );

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const estoqueAindaReservado = [
        'AGUARDANDO_PAGAMENTO',
        'RECEBIDO',
        'EM_PREPARO',
        'PRONTO',
      ].includes(pedido.status);
      if (status === 'CANCELADO' && estoqueAindaReservado) {
        await this.estornarEstoque(tx, pedido);
      }
      return tx.pedido.update({
        where: { id },
        data: { status: status as StatusPedido },
        include: { itens: true },
      });
    });

    await this.auditoria.registrar({
      usuarioId: usuario.sub,
      acao: 'ATUALIZAR_STATUS_PEDIDO',
      recurso: 'pedidos',
      recursoId: String(id),
      detalhes: { de: pedido.status, para: status },
    });

    return this.serializar(atualizado);
  }

  async estornarEstoque(
    tx: Prisma.TransactionClient,
    pedido: { unidadeId: number; itens: Array<{ produtoId: number; quantidade: number }> },
  ) {
    for (const item of pedido.itens) {
      const estoque = await tx.estoque.findUnique({
        where: {
          unidadeId_produtoId: {
            unidadeId: pedido.unidadeId,
            produtoId: item.produtoId,
          },
        },
      });
      if (!estoque) continue;
      await tx.estoque.update({
        where: { id: estoque.id },
        data: { quantidade: estoque.quantidade + item.quantidade },
      });
      await tx.movimentacaoEstoque.create({
        data: {
          estoqueId: estoque.id,
          tipo: 'ESTORNO',
          quantidade: item.quantidade,
          motivo: 'Cancelamento ou pagamento recusado',
        },
      });
    }
  }

  serializar(pedido: {
    id: number;
    clienteId: number | null;
    unidadeId: number;
    canalPedido: CanalPedido;
    status: StatusPedido;
    total: { toString(): string } | number;
    desconto: { toString(): string } | number;
    codigoPromocional: string | null;
    createdAt: Date;
    itens: Array<{
      produtoId: number;
      quantidade: number;
      precoUnitario: { toString(): string } | number;
    }>;
    pagamento?: unknown;
  }) {
    return {
      pedidoId: pedido.id,
      clienteId: pedido.clienteId,
      unidadeId: pedido.unidadeId,
      canalPedido: pedido.canalPedido,
      status: pedido.status,
      total: Number(pedido.total),
      desconto: Number(pedido.desconto),
      codigoPromocional: pedido.codigoPromocional,
      createdAt: pedido.createdAt.toISOString(),
      itens: pedido.itens.map((i) => ({
        produtoId: i.produtoId,
        quantidade: i.quantidade,
        precoUnitario: Number(i.precoUnitario),
      })),
      pagamento: pedido.pagamento ?? undefined,
    };
  }
}
