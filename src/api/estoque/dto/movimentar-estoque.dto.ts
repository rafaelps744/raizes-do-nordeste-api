import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsPositive, IsString, Min } from 'class-validator';

export class MovimentarEstoqueDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  unidadeId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @IsPositive()
  produtoId: number;

  @ApiProperty({ enum: ['ENTRADA', 'SAIDA'] })
  @IsEnum(['ENTRADA', 'SAIDA'])
  tipo: 'ENTRADA' | 'SAIDA';

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  quantidade: number;

  @ApiProperty({ example: 'Reposição de câmara fria' })
  @IsString()
  motivo: string;
}
