import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './User';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

@Entity({ name: 'payments' })
@Index(['userId'])
@Index(['status'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, u => u.payments, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'float' })
  amount!: number;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: PaymentStatus;

  @Column()
  paymentMethod!: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  paymentIntentId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()', onUpdate: 'now()' })
  updatedAt!: Date;
}
