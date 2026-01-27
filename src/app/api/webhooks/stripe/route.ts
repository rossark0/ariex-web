import Stripe from 'stripe';
import { headers } from 'next/headers';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://qt4pgrsacn.us-east-2.awsapprunner.com';

interface StripeMetadata {
  chargeId?: string;
  agreementId?: string;
  clientId?: string;
}

/**
 * Update charge status in the backend
 */
async function updateChargeStatus(chargeId: string, status: 'paid' | 'failed' | 'cancelled'): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/charges/${chargeId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      console.error('[Stripe Webhook] Failed to update charge status:', response.status);
      return false;
    }
    
    console.log(`[Stripe Webhook] Charge ${chargeId} status updated to ${status}`);
    return true;
  } catch (error) {
    console.error('[Stripe Webhook] Error updating charge status:', error);
    return false;
  }
}

/**
 * Mark the "Pay" todo as completed for a client
 */
async function markPayTodoComplete(agreementId: string): Promise<boolean> {
  try {
    // Get the agreement to find associated todos
    const agreementResponse = await fetch(`${API_BASE_URL}/agreements/${agreementId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!agreementResponse.ok) {
      console.error('[Stripe Webhook] Failed to fetch agreement:', agreementResponse.status);
      return false;
    }
    
    const agreement = await agreementResponse.json();
    const todos = agreement?.todoLists?.flatMap((list: { todos?: Array<{ id: string; title: string; status: string }> }) => list.todos || []) || [];
    
    // Find the "Pay" todo
    const payTodo = todos.find((t: { title: string; status: string }) => 
      t.title.toLowerCase() === 'pay' || t.title.toLowerCase().includes('payment')
    );
    
    if (!payTodo) {
      console.log('[Stripe Webhook] No Pay todo found for agreement:', agreementId);
      return false;
    }
    
    if (payTodo.status === 'completed') {
      console.log('[Stripe Webhook] Pay todo already completed');
      return true;
    }
    
    // Update the todo status
    const updateResponse = await fetch(`${API_BASE_URL}/todos/${payTodo.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    
    if (!updateResponse.ok) {
      console.error('[Stripe Webhook] Failed to update todo:', updateResponse.status);
      return false;
    }
    
    console.log(`[Stripe Webhook] Pay todo ${payTodo.id} marked as completed`);
    return true;
  } catch (error) {
    console.error('[Stripe Webhook] Error marking pay todo complete:', error);
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  
  let event: Stripe.Event;
  
  // Verify webhook signature (if secret is configured)
  if (WEBHOOK_SECRET && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }
  } else {
    // Development mode - parse without verification
    console.warn('[Stripe Webhook] Running without signature verification (dev mode)');
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }
  }
  
  console.log(`[Stripe Webhook] Received event: ${event.type}`);
  
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata as StripeMetadata;
      
      console.log('[Stripe Webhook] Checkout session completed:', {
        sessionId: session.id,
        paymentStatus: session.payment_status,
        metadata,
      });
      
      if (session.payment_status === 'paid' && metadata?.chargeId) {
        // Update charge status to paid
        await updateChargeStatus(metadata.chargeId, 'paid');
        
        // Mark the Pay todo as completed
        if (metadata.agreementId) {
          await markPayTodoComplete(metadata.agreementId);
        }
      }
      break;
    }
    
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata as StripeMetadata;
      
      console.log('[Stripe Webhook] Checkout session expired:', session.id);
      
      if (metadata?.chargeId) {
        await updateChargeStatus(metadata.chargeId, 'cancelled');
      }
      break;
    }
    
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata as StripeMetadata;
      
      console.log('[Stripe Webhook] Payment intent succeeded:', paymentIntent.id);
      
      if (metadata?.chargeId) {
        await updateChargeStatus(metadata.chargeId, 'paid');
        
        if (metadata.agreementId) {
          await markPayTodoComplete(metadata.agreementId);
        }
      }
      break;
    }
    
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const metadata = paymentIntent.metadata as StripeMetadata;
      
      console.log('[Stripe Webhook] Payment intent failed:', paymentIntent.id);
      
      if (metadata?.chargeId) {
        await updateChargeStatus(metadata.chargeId, 'failed');
      }
      break;
    }
    
    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
  
  // Return success
  return new Response(JSON.stringify({ received: true }), { 
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
