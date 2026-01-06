import type { User, Subscription } from '@ariexai/shared';

export interface ApiUser extends User {}

export interface ApiSubscription extends Subscription {}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
