import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import type { Request } from 'express';
import { FidelidadeService } from '../../application/fidelidade.service.js';
import type { JwtPayload } from '../auth/jwt-payload.js';

class ResgatarDto {
  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(100)
  pontos: number;
}

@ApiTags('fidelidade')
@ApiBearerAuth()
@Controller('fidelidade')
export class FidelidadeController {
  constructor(private readonly fidelidade: FidelidadeService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar saldo e histórico de pontos' })
  saldo(@Req() req: Request & { user: JwtPayload }) {
    return this.fidelidade.saldo(req.user.sub);
  }

  @Post('resgatar')
  @ApiOperation({ summary: 'Resgatar pontos (mínimo 100 = R$ 10,00)' })
  resgatar(
    @Body() dto: ResgatarDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.fidelidade.resgatar(req.user.sub, dto.pontos);
  }
}
