import { IsString, IsOptional, IsNumber } from 'class-validator';

export class ExecuteCommandDto {
  @IsString()
  command!: string;

  @IsOptional()
  @IsNumber()
  timeout?: number;
}
