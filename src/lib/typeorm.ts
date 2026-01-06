import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '@/db/entities/User';
import { ClientProfile } from '@/db/entities/ClientProfile';
import { Document } from '@/db/entities/Document';
import { TaxStrategy } from '@/db/entities/TaxStrategy';
import { Payment } from '@/db/entities/Payment';
import { Message } from '@/db/entities/Message';

/**
 * Create a TypeORM DataSource using DATABASE_URL
 */
function createDataSourceFromEnv(): DataSource {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  return new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [User, ClientProfile, Document, TaxStrategy, Payment, Message],
    synchronize: false, // use migrations in production; set true only during development
    logging: process.env.NODE_ENV === 'development',
  });
}

export const AppDataSource = createDataSourceFromEnv();
