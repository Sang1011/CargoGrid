import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'admin@cargogrid.local' })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail()
    email: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(128)
    password: string;
}

export class RefreshDto {
    @ApiProperty()
    @IsString()
    @MinLength(20)
    @MaxLength(200)
    refreshToken: string;
}

export class CreateUserDto {
    @ApiProperty()
    @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
    @IsEmail()
    email: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(150)
    fullName: string;

    @ApiProperty({ type: [String], example: ['warehouse_operator'] })
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    roles: string[];
}

export class UpdateUserDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) @MaxLength(150) fullName?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
    @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) roles?: string[];
    @ApiPropertyOptional({ minLength: 8 }) @IsOptional() @IsString() @MinLength(8) @MaxLength(128) password?: string;
}
