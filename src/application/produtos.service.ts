import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';

@Injectable()
export class ProdutosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(page = 1, limit = 10, unidadeId?: number) {
    const skip = (page - 1) * limit;
    if (unidadeId) {
      const [items, total] = await this.prisma.$transaction([
        this.prisma.cardapioUnidade.findMany({
          where: { unidadeId, disponivel: true, produto: { ativo: true } },
          include: { produto: true },
          skip,
          take: limit,
          orderBy: { id: 'asc' },
        }),
        this.prisma.cardapioUnidade.count({
          where: { unidadeId, disponivel: true, produto: { ativo: true } },
        }),
      ]);
      return {
        data: items.map((c) => ({
          ...c.produto,
          preco: Number(c.produto.preco),
          unidadeId,
          disponivelNaUnidade: c.disponivel,
        })),
        page,
        limit,
        total,
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.produto.findMany({
        where: { ativo: true },
        skip,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      this.prisma.produto.count({ where: { ativo: true } }),
    ]);
    return {
      data: data.map((p) => ({ ...p, preco: Number(p.preco) })),
      page,
      limit,
      total,
    };
  }

  async obter(id: number) {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    return { ...produto, preco: Number(produto.preco) };
  }
}
