import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';

@Injectable()
export class UnidadesService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.unidade.findMany({
      where: { ativa: true },
      orderBy: { nome: 'asc' },
    });
  }

  async obter(id: number) {
    const unidade = await this.prisma.unidade.findUnique({ where: { id } });
    if (!unidade) throw new NotFoundException('Unidade não encontrada.');
    return unidade;
  }
}
