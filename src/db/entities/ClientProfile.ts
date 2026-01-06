import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity({ name: 'client_profiles' })
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  userId!: string;

  @OneToOne(() => User, u => u.clientProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'varchar', nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', nullable: true })
  zipCode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  taxId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  businessName!: string | null;

  @Column({ type: 'boolean', default: false })
  onboardingComplete!: boolean;

  @Column({ type: 'varchar', nullable: true })
  filingStatus!: string | null;

  @Column({ type: 'int', nullable: true })
  dependents!: number | null;

  @Column({ type: 'float', nullable: true })
  estimatedIncome!: number | null;

  @Column({ type: 'varchar', nullable: true })
  businessType!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()', onUpdate: 'now()' })
  updatedAt!: Date;
}
