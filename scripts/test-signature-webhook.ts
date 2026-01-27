/**
 * Test script for SignatureAPI webhook
 * 
 * Usage:
 *   pnpm tsx scripts/test-signature-webhook.ts <envelope_id>
 *   pnpm tsx scripts/test-signature-webhook.ts <envelope_id> <event_type>
 * 
 * Example:
 *   pnpm tsx scripts/test-signature-webhook.ts 8657bf93-99ab-4d6c-ba06-926e3fd7717c
 *   pnpm tsx scripts/test-signature-webhook.ts 8657bf93-99ab-4d6c-ba06-926e3fd7717c recipient.completed
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/signature';

// Example agreements from the database (for reference)
const KNOWN_AGREEMENTS = [
  { 
    envelopeId: '8657bf93-99ab-4d6c-ba06-926e3fd7717c',
    agreementId: '09691c2a-e28f-4465-b25a-0b28d2f165a3',
    documentId: '691c450e-cd05-436f-8055-20cfb690faea'
  },
  { 
    envelopeId: '52fe4335-8c80-4302-be9b-72f1624fd418',
    agreementId: 'ce1cd015-db16-4187-91d6-08e58ce4eb2b',
    documentId: '0b624b71-09c6-4e5d-a347-21a169f9223a'
  },
];

async function testWebhook(envelopeId: string, eventType: string = 'recipient.completed') {
  // Simulate SignatureAPI webhook payload
  const payload = {
    id: `evt_${Date.now()}`,
    type: eventType,
    timestamp: new Date().toISOString(),
    data: {
      envelope_id: envelopeId,
      recipient_id: 're_test_recipient',
      recipient_type: 'signer',
      // Include deliverable URL for deliverable.generated event
      ...(eventType === 'deliverable.generated' && {
        deliverable_url: 'https://example.com/signed-document.pdf',
      }),
    },
  };

  console.log('\n📤 Sending test webhook...');
  console.log('URL:', WEBHOOK_URL);
  console.log('Event type:', eventType);
  console.log('Envelope ID:', envelopeId);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('\n---');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    
    console.log('📥 Response:');
    console.log('Status:', response.status);
    console.log('Body:', responseText);
    
    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('\n💡 Check your terminal running `pnpm dev` for logs');
    } else {
      console.log('\n❌ Webhook test failed');
    }
  } catch (error) {
    console.error('\n❌ Error sending webhook:', error);
  }
}

// Get envelope ID from command line args
const envelopeId = process.argv[2];
const eventType = process.argv[3] || 'recipient.completed';

if (!envelopeId) {
  console.log(`
SignatureAPI Webhook Test Script
================================

Usage: pnpm tsx scripts/test-signature-webhook.ts <envelope_id> [event_type]

Event types:
  - recipient.completed (default) - Recipient finished signing
  - recipient.ceremony_started    - Recipient started signing
  - envelope.completed            - All recipients signed
  - envelope.declined             - Envelope was declined
  - deliverable.generated         - Signed PDF is ready

Known agreements from your database:
`);
  
  KNOWN_AGREEMENTS.forEach((a, i) => {
    console.log(`  ${i + 1}. Envelope: ${a.envelopeId}`);
    console.log(`     Agreement: ${a.agreementId}`);
    console.log(`     Document: ${a.documentId}\n`);
  });
  
  console.log(`Example:
  pnpm tsx scripts/test-signature-webhook.ts ${KNOWN_AGREEMENTS[0].envelopeId}
`);
  process.exit(1);
}

testWebhook(envelopeId, eventType);
