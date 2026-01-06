import { Resend } from 'resend';
import WelcomeEmail from '@/contexts/emails/templates/welcome-email';
import TrialStartedEmail from '@/contexts/emails/templates/trial-started-email';
import TrialEndingEmail from '@/contexts/emails/templates/trial-ending-email';
import PaymentFailedEmail from '@/contexts/emails/templates/payment-failed-email';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'Team <hello@example.com>';

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(to: string, userName?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Welcome to our platform!',
      react: WelcomeEmail({ userName }),
    });

    if (error) {
      console.error('Failed to send welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, error };
  }
}

/**
 * Send trial started email
 */
export async function sendTrialStartedEmail(to: string, userName?: string, trialDays?: number) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your ${trialDays || 14}-day trial has started`,
      react: TrialStartedEmail({ userName, trialDays }),
    });

    if (error) {
      console.error('Failed to send trial started email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send trial started email:', error);
    return { success: false, error };
  }
}

/**
 * Send trial ending soon email
 */
export async function sendTrialEndingEmail(to: string, userName?: string, daysLeft?: number) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your trial ends in ${daysLeft || 3} days`,
      react: TrialEndingEmail({ userName, daysLeft }),
    });

    if (error) {
      console.error('Failed to send trial ending email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send trial ending email:', error);
    return { success: false, error };
  }
}

/**
 * Send payment failed email
 */
export async function sendPaymentFailedEmail(to: string, userName?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: 'Payment failed - Action required',
      react: PaymentFailedEmail({ userName }),
    });

    if (error) {
      console.error('Failed to send payment failed email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
    return { success: false, error };
  }
}
