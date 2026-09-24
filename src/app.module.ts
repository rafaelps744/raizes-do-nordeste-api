import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditoriaController } from './api/auditoria/auditoria.controller.js';
import { AuthController, UsuariosController } from './api/auth/auth.controller.js';
import { JwtAuthGuard } from './api/auth/jwt-auth.guard.js';
import { JwtStrategy } from './api/auth/jwt.strategy.js';
import { PerfisGuard } from './api/auth/perfis.guard.js';
import {
  ProdutosController,
  UnidadesController,
} from './api/catalogo/catalogo.controller.js';
import { EstoqueController } from './api/estoque/estoque.controller.js';
import { FidelidadeController } from './api/fidelidade/fidelidade.controller.js';
import { PagamentosController } from './api/pagamentos/pagamentos.controller.js';
import { PedidosController } from './api/pedidos/pedidos.controller.js';
import { AuthService } from './application/auth.service.js';
import { EstoqueService } from './application/estoque.service.js';
import { FidelidadeService } from './application/fidelidade.service.js';
import { PagamentosService } from './application/pagamentos.service.js';
import { PedidosService } from './application/pedidos.service.js';
import { ProdutosService } from './application/produtos.service.js';
import { UnidadesService } from './application/unidades.service.js';
import { AuditoriaService } from './infrastructure/auditoria/auditoria.service.js';
import { PrismaService } from './infrastructure/database/prisma.service.js';
import { PagamentoMockGateway } from './infrastructure/pagamento/pagamento-mock.gateway.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'raizes-dev-secret'),
        signOptions: {
          expiresIn: '8h',
        },
      }),
    }),
  ],
  controllers: [
    AppController,
    AuthController,
    UsuariosController,
    UnidadesController,
    ProdutosController,
    EstoqueController,
    PedidosController,
    PagamentosController,
    FidelidadeController,
    AuditoriaController,
  ],
  providers: [
    AppService,
    PrismaService,
    AuditoriaService,
    PagamentoMockGateway,
    AuthService,
    UnidadesService,
    ProdutosService,
    EstoqueService,
    PedidosService,
    FidelidadeService,
    PagamentosService,
    JwtStrategy,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PerfisGuard },
  ],
})
export class AppModule {}
