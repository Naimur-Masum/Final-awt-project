import { Entity,PrimaryGeneratedColumn,Column,CreateDateColumn } from "typeorm";
import { UserRole } from "../enums/role.enum";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column({select: false})
    password: string;

    @Column({
        type: 'enum',
        enum: UserRole,
        default: UserRole.STUDENT,
    })
    role: UserRole;

    @CreateDateColumn()
    createdAt: Date;

}