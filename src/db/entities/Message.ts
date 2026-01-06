import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './User';

@Entity({ name: 'messages' })
@Index(['userId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, u => u.messages, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  role!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
