import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './User';

@Entity({ name: 'tax_strategies' })
@Index(['userId'])
@Index(['priority'])
export class TaxStrategy {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, u => u.strategies, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  category!: string;

  @Column({ type: 'float', nullable: true })
  estimatedSavings!: number | null;

  @Column()
  priority!: string;

  @Column({ type: 'boolean', default: true })
  aiGenerated!: boolean;

  @Column({ type: 'float', nullable: true })
  aiConfidence!: number | null;

  @Column({ type: 'boolean', default: false })
  implemented!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  implementedAt!: Date | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()', onUpdate: 'now()' })
  updatedAt!: Date;
}
