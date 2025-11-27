import { IsInt, Min, IsOptional, IsString, Length } from 'class-validator';

export class CreateListDto {
	@IsString()
	@Length(1, 100)
	name!: string;

	@IsOptional()
	@IsInt()
	@Min(0)
	order?: number;
}

export class UpdateListDto {
	@IsOptional()
	@IsString()
	@Length(1, 100)
	name?: string;

	@IsOptional()
	@IsInt()
	@Min(0)
	order?: number;
}

export class ReorderListDto {
	@IsInt()
	@Min(1)
	listId!: number;

	@IsInt()
	@Min(0)
	newOrder!: number;
}

