import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  taskId!: string;

  @IsOptional()
  @IsString()
  mountPath?: string;

  @IsOptional()
  @IsObject()
  dockerConfig?: Record<string, unknown>;
}
