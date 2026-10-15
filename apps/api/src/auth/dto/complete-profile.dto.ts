import { IsString, Length, Matches } from 'class-validator';

export class CompleteProfileDto {
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can contain only letters, numbers and underscores',
  })
  username!: string;

  @IsString()
  @Length(2, 80)
  displayName!: string;
}
