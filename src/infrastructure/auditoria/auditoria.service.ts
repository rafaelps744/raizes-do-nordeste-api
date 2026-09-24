import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: {
    usuarioId?: number | null;
    acao: string;
    recurso: string;
    recursoId?: string;
    detalhes?: Prisma.InputJsonValue;
    ip?: string;
  }) {
    return this.prisma.logAuditoria.create({
      data: {
        usuarioId: params.usuarioId ?? null,
        acao: params.acao,
        recurso: params.recurso,
        recursoId: params.recursoId,
        detalhes: params.detalhes,
        ip: params.ip,
      },
    });
  }
}
