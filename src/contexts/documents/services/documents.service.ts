'use server';

// DISABLED: This service uses utilities that don't exist yet

export async function fetchDocuments() {
  throw new Error('Not implemented');
}

export async function fetchDocument(documentId: string) {
  throw new Error('Not implemented');
}

export async function createDocument(documentData: { title: string; content: string }) {
  throw new Error('Not implemented');
}

export async function updateDocument(
  documentId: string,
  documentData: { title: string; content: string }
) {
  throw new Error('Not implemented');
}

export async function deleteDocument(documentId: string) {
  throw new Error('Not implemented');
}

export async function startDocumentProcessing(documentId: string) {
  throw new Error('Not implemented');
}

export async function checkDocumentStatus(documentId: string) {
  throw new Error('Not implemented');
}
