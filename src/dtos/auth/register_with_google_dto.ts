import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterUserDto {
  @IsString()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  uid!: string;

  @IsString()
  @IsOptional()
  inviteCode?: string;
}
