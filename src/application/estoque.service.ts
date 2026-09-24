import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AuditoriaService } from '../infrastructure/auditoria/auditoria.service.js';
import { RegraNegocioError } from '../domain/pedido-regras.js';

@Injectable()
export class EstoqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async consultar(unidadeId: number) {
    await this.garantirUnidade(unidadeId);
    const itens = await this.prisma.estoque.findMany({
      where: { unidadeId },
      include: { produto: true },
      orderBy: { id: 'asc' },
    });
    return itens.map((e) => ({
      estoqueId: e.id,
      unidadeId: e.unidadeId,
      produtoId: e.produtoId,
      produto: e.produto.nome,
      quantidade: e.quantidade,
    }));
  }

  async movimentar(input: {
    unidadeId: number;
    produtoId: number;
    tipo: 'ENTRADA' | 'SAIDA';
    quantidade: number;
    motivo: string;
    usuarioId?: number;
  }) {
    if (input.quantidade <= 0) {
      throw new RegraNegocioError(
        'QUANTIDADE_INVALIDA',
        'A quantidade deve ser maior que zero.',
        [{ field: 'quantidade', issue: 'Deve ser positiva' }],
        422,
      );
    }

    await this.garantirUnidade(input.unidadeId);
    const produto = await this.prisma.produto.findUnique({
      where: { id: input.produtoId },
    });
    if (!produto) throw new NotFoundException('Produto não encontrado.');

    const estoque = await this.prisma.estoque.upsert({
      where: {
        unidadeId_produtoId: {
          unidadeId: input.unidadeId,
          produtoId: input.produtoId,
        },
      },
      update: {},
      create: {
        unidadeId: input.unidadeId,
        produtoId: input.produtoId,
        quantidade: 0,
      },
    });

    if (input.tipo === 'SAIDA' && estoque.quantidade < input.quantidade) {
      throw new RegraNegocioError(
        'ESTOQUE_INSUFICIENTE',
        'Não há quantidade suficiente em estoque.',
        [
          {
            field: 'quantidade',
            issue: `Disponível: ${estoque.quantidade}`,
          },
        ],
      );
    }

    const novaQtd =
      input.tipo === 'ENTRADA'
        ? estoque.quantidade + input.quantidade
        : estoque.quantidade - input.quantidade;

    const atualizado = await this.prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacaoEstoque.create({
        data: {
          estoqueId: estoque.id,
          tipo: input.tipo,
          quantidade: input.quantidade,
          motivo: input.motivo,
          usuarioId: input.usuarioId,
        },
      });
      const est = await tx.estoque.update({
        where: { id: estoque.id },
        data: { quantidade: novaQtd },
      });
      return { mov, est };
    });

    await this.auditoria.registrar({
      usuarioId: input.usuarioId,
      acao: `ESTOQUE_${input.tipo}`,
      recurso: 'estoque',
      recursoId: String(estoque.id),
      detalhes: {
        unidadeId: input.unidadeId,
        produtoId: input.produtoId,
        quantidade: input.quantidade,
      },
    });

    return {
      estoqueId: atualizado.est.id,
      quantidade: atualizado.est.quantidade,
      movimentacaoId: atualizado.mov.id,
    };
  }

  private async garantirUnidade(id: number) {
    const unidade = await this.prisma.unidade.findUnique({ where: { id } });
    if (!unidade) throw new NotFoundException('Unidade não encontrada.');
  }
}
