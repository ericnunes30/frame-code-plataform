import { IsOptional, IsString } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  repoUrl?: string;

  @IsOptional()
  @IsString()
  defaultBranch?: string;
}
