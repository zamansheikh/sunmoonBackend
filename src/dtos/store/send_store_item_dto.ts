import { IsNumber, Min, IsNotEmpty, IsMongoId, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class SendStoreItemDto {
  @IsNumber()
  @Min(100001)
  @Type(() => Number)
  recipientUserId!: number;

  @IsMongoId()
  @IsNotEmpty()
  itemId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceIndex?: number;
}
