import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AuditoriaService } from '../infrastructure/auditoria/auditoria.service.js';
import { pontosPorValorPago, RegraNegocioError } from '../domain/pedido-regras.js';

@Injectable()
export class FidelidadeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async saldo(usuarioId: number) {
    const conta = await this.obterOuNulo(usuarioId);
    if (!conta) {
      return {
        pontos: 0,
        consentimento: false,
        mensagem:
          'Programa de fidelidade disponível após consentimento no cadastro/perfil.',
      };
    }
    return {
      pontos: conta.pontos,
      consentimento: true,
      movimentos: conta.movimentos,
    };
  }

  async creditarCompra(usuarioId: number, total: number, pedidoId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario?.consentimentoFidelidade) return null;
    const pontos = pontosPorValorPago(total);
    if (pontos <= 0) return null;

    const conta = await this.garantirConta(usuarioId);
    const atualizada = await this.prisma.contaFidelidade.update({
      where: { id: conta.id },
      data: {
        pontos: { increment: pontos },
        movimentos: {
          create: {
            pontos,
            tipo: 'CREDITO',
            descricao: `Acúmulo do pedido ${pedidoId}`,
          },
        },
      },
    });
    return atualizada;
  }

  async resgatar(usuarioId: number, pontos: number) {
    if (pontos < 100) {
      throw new RegraNegocioError(
        'RESGATE_MINIMO',
        'O resgate mínimo é de 100 pontos (R$ 10,00).',
        [{ field: 'pontos', issue: 'Mínimo: 100' }],
        422,
      );
    }
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario?.consentimentoFidelidade) {
      throw new RegraNegocioError(
        'CONSENTIMENTO_AUSENTE',
        'É necessário consentimento LGPD para usar a fidelidade.',
        [{ field: 'consentimentoFidelidade', issue: 'Não concedido' }],
        409,
      );
    }
    const conta = await this.garantirConta(usuarioId);
    if (conta.pontos < pontos) {
      throw new RegraNegocioError(
        'PONTOS_INSUFICIENTES',
        'Saldo de pontos insuficiente.',
        [{ field: 'pontos', issue: `Disponível: ${conta.pontos}` }],
      );
    }
    const valor = Number(((pontos / 10) * 1).toFixed(2));
    const atualizada = await this.prisma.contaFidelidade.update({
      where: { id: conta.id },
      data: {
        pontos: { decrement: pontos },
        movimentos: {
          create: {
            pontos,
            tipo: 'RESGATE',
            descricao: `Resgate de ${pontos} pontos (R$ ${valor.toFixed(2)})`,
          },
        },
      },
    });
    await this.auditoria.registrar({
      usuarioId,
      acao: 'RESGATE_FIDELIDADE',
      recurso: 'fidelidade',
      recursoId: String(conta.id),
      detalhes: { pontos, valor },
    });
    return { pontosRestantes: atualizada.pontos, valorResgatado: valor };
  }

  private async obterOuNulo(usuarioId: number) {
    return this.prisma.contaFidelidade.findUnique({
      where: { usuarioId },
      include: { movimentos: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
  }

  private async garantirConta(usuarioId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return this.prisma.contaFidelidade.upsert({
      where: { usuarioId },
      update: {},
      create: { usuarioId, pontos: 0 },
    });
  }
}
