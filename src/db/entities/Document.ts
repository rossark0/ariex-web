import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from './User';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type SignatureStatus = 'NOT_SENT' | 'SENT' | 'SIGNED' | 'DECLINED' | 'EXPIRED';

@Entity({ name: 'documents' })
@Index(['userId'])
@Index(['status'])
@Index(['category'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (u: User) => u.documents, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @Column()
  fileUrl!: string;

  @Column({ type: 'int' })
  fileSize!: number;

  @Column()
  mimeType!: string;

  @Column({ type: 'varchar', nullable: true })
  category!: string | null;

  @Column({ type: 'int', nullable: true })
  taxYear!: number | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  status!: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  aiSummary!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  aiInsights!: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  extractedData!: Record<string, any> | null;

  @Column({ type: 'varchar', default: 'NOT_SENT' })
  signatureStatus!: SignatureStatus;

  @Column({ type: 'varchar', nullable: true })
  envelopeId!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  signedDocUrl!: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', default: () => 'now()', onUpdate: 'now()' })
  updatedAt!: Date;
}
