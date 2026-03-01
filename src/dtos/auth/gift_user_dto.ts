import { IsNumber, IsOptional, isString, IsString } from "class-validator";

export class GiftUserDto {
  @IsString()
  giftId!: string;
}
