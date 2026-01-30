/**
 * Direct webhook test - bypasses agreement lookup by using known IDs
 * 
 * This script simulates what the webhook SHOULD do when it finds an agreement.
 * Use this to test the individual update functions work correctly.
 * 
 * Usage:
 *   pnpm tsx scripts/test-webhook-direct.ts
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL 

// Known agreement from your database
const TEST_DATA = {
  agreementId: '09691c2a-e28f-4465-b25a-0b28d2f165a3',
  documentId: '691c450e-cd05-436f-8055-20cfb690faea',
};

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  console.log(`\n📤 ${options.method || 'GET'} ${endpoint}`);
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();
  console.log(`📥 Status: ${response.status}`);
  console.log(`   Body: ${text.slice(0, 200)}${text.length > 200 ? '...' : ''}`);
  
  return { ok: response.ok, status: response.status, text };
}

async function testDocumentSigned() {
  console.log('\n========================================');
  console.log('Testing: Mark Document as Signed');
  console.log('========================================');
  
  // Try POST /documents/{id}/sign
  const result = await apiRequest(`/documents/${TEST_DATA.documentId}/sign`, {
    method: 'POST',
  });
  
  return result.ok;
}

async function testAgreementSigned() {
  console.log('\n========================================');
  console.log('Testing: Mark Agreement as ACTIVE');
  console.log('========================================');
  
  // Strategy 1: Try dedicated sign endpoint
  let result = await apiRequest(`/agreements/${TEST_DATA.agreementId}/sign`, {
    method: 'POST',
  });
  if (result.ok) {
    console.log('✅ Strategy 1 worked: POST /agreements/{id}/sign');
    return true;
  }

  // Strategy 2: Try PATCH with status
  result = await apiRequest(`/agreements/${TEST_DATA.agreementId}`, {
    method: 'PATCH',
    body: JSON.stringify({ 
      status: 'ACTIVE',
      signedAt: new Date().toISOString(),
    }),
  });
  if (result.ok) {
    console.log('✅ Strategy 2 worked: PATCH /agreements/{id} with status');
    return true;
  }

  // Strategy 3: Try PUT with status
  result = await apiRequest(`/agreements/${TEST_DATA.agreementId}`, {
    method: 'PUT',
    body: JSON.stringify({ 
      status: 'ACTIVE',
    }),
  });
  if (result.ok) {
    console.log('✅ Strategy 3 worked: PUT /agreements/{id} with status');
    return true;
  }

  console.log('❌ All strategies failed');
  return false;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Direct Webhook Test - Testing Individual API Calls       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nTest Data:');
  console.log(`  Agreement ID: ${TEST_DATA.agreementId}`);
  console.log(`  Document ID:  ${TEST_DATA.documentId}`);
  console.log(`  API URL:      ${API_URL}`);

  const results = {
    document: await testDocumentSigned(),
    agreement: await testAgreementSigned(),
  };

  console.log('\n========================================');
  console.log('RESULTS SUMMARY');
  console.log('========================================');
  console.log(`Document signed:    ${results.document ? '✅' : '❌'}`);
  console.log(`Agreement ACTIVE:   ${results.agreement ? '✅' : '❌'}`);
  
  if (results.document && results.agreement) {
    console.log('\n🎉 All tests passed! The webhook should work correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the API endpoints above.');
    console.log('\nNote: These endpoints may require authentication.');
    console.log('The webhook needs a way to call these without user auth.');
    console.log('\nOptions:');
    console.log('1. Add SERVICE_API_KEY to .env and have backend accept it');
    console.log('2. Create unauthenticated webhook endpoints in backend');
    console.log('3. Use a service account token');
  }
}

main().catch(console.error);
