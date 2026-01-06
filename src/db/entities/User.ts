import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, Index } from 'typeorm';
import { ClientProfile } from './ClientProfile';
import { Document } from './Document';
import { Payment } from './Payment';
import { Message } from './Message';
import { TaxStrategy } from './TaxStrategy';

export type Role = 'ADMIN' | 'CLIENT';

@Entity({ name: 'users' })
@Index(['email'])
@Index(['role'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar' })
  password!: string;

  @Column({ type: 'varchar', default: 'CLIENT' })
  role!: Role;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()', onUpdate: 'now()' })
  updatedAt!: Date;

  @OneToOne(() => ClientProfile, p => p.user)
  clientProfile?: ClientProfile;

  @OneToMany(() => Document, d => d.user)
  documents!: Document[];

  @OneToMany(() => Payment, p => p.user)
  payments!: Payment[];

  @OneToMany(() => Message, m => m.user)
  messages!: Message[];

  @OneToMany(() => TaxStrategy, s => s.user)
  strategies!: TaxStrategy[];
}
