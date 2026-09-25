import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class SolicitarPagamentoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  pedidoId: number;

  @ApiPropertyOptional({
    description: 'Força recusa no gateway mock (cenário negativo)',
  })
  @IsOptional()
  @IsBoolean()
  forcarRecusa?: boolean;
}
