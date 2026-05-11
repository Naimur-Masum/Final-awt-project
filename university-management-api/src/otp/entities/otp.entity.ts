import { Entity,PrimaryGeneratedColumn,Column,CreateDateColumn } from "typeorm";
import { OtpType } from "../enums/otp-type.enum";

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({type:'enum',enum:OtpType})
  type: OtpType;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}