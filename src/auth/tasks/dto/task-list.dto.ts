import { IsOptional, IsString, Length } from 'class-validator';

export class CreateListDto {
  @IsString()
  @Length(1, 100)
  name!: string;
}

export class UpdateListDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;
}
