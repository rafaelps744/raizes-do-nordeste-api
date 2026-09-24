import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AuditoriaService } from '../infrastructure/auditoria/auditoria.service.js';
import type { CadastrarUsuarioDto } from '../api/auth/dto/cadastrar-usuario.dto.js';
import type { LoginDto } from '../api/auth/dto/login.dto.js';
import type { JwtPayload } from '../api/auth/jwt-payload.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async cadastrar(dto: CadastrarUsuarioDto, opcoes?: { permitirPerfil?: boolean }) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existente) {
      throw new ConflictException('E-mail já cadastrado.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const perfil = opcoes?.permitirPerfil ? (dto.perfil ?? 'CLIENTE') : 'CLIENTE';
    const usuario = await this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email.toLowerCase(),
        telefone: dto.telefone,
        senhaHash,
        perfil,
        consentimentoFidelidade: Boolean(dto.consentimentoFidelidade),
        consentimentoFidelidadeEm: dto.consentimentoFidelidade
          ? new Date()
          : null,
        consentimentos: dto.consentimentoFidelidade
          ? {
              create: {
                finalidade: 'Programa de fidelização e acúmulo de pontos',
                baseLegal: 'Consentimento (art. 7º, I, LGPD)',
                aceito: true,
              },
            }
          : undefined,
        fidelidade: dto.consentimentoFidelidade
          ? { create: { pontos: 0 } }
          : undefined,
      },
    });

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'CADASTRO_USUARIO',
      recurso: 'usuarios',
      recursoId: String(usuario.id),
    });

    return this.sanitizar(usuario);
  }

  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!usuario || !usuario.ativo) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    const ok = await bcrypt.compare(dto.senha, usuario.senhaHash);
    if (!ok) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil,
    };
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '8h');
    const accessToken = await this.jwt.signAsync(payload);

    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'LOGIN',
      recurso: 'auth',
      recursoId: String(usuario.id),
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.sanitizar(usuario),
    };
  }

  async perfil(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { fidelidade: true, consentimentos: true },
    });
    if (!usuario) throw new UnauthorizedException('Usuário não encontrado.');
    return this.sanitizar(usuario);
  }

  private sanitizar<T extends { senhaHash: string }>(usuario: T) {
    const { senhaHash: _, ...rest } = usuario;
    return rest;
  }
}
