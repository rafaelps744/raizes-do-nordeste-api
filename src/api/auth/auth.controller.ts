import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../../application/auth.service.js';
import { Perfis, Publico } from './auth.decorators.js';
import { CadastrarUsuarioDto } from './dto/cadastrar-usuario.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './jwt-payload.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('cadastro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cadastrar usuário (cliente por padrão)' })
  cadastrar(@Body() dto: CadastrarUsuarioDto) {
    return this.auth.cadastrar(dto);
  }

  @Publico()
  @Post('login')
  @ApiOperation({ summary: 'Autenticar e retornar JWT' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Perfil do usuário autenticado (sem senha)' })
  me(@Req() req: Request & { user: JwtPayload }) {
    return this.auth.perfil(req.user.sub);
  }
}

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @Perfis('ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Cadastrar usuário interno (gerente/admin)' })
  criar(@Body() dto: CadastrarUsuarioDto) {
    return this.auth.cadastrar(dto, { permitirPerfil: true });
  }
}
