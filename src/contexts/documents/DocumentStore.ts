import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

export interface DocumentState {
  documents: any[];
  selectedDocument: any | null;
  isUploading: boolean;
  isLoading: boolean;
  setDocuments: (documents: any[]) => void;
  setSelectedDocument: (document: any | null) => void;
  setIsUploading: (uploading: boolean) => void;
  setIsLoading: (loading: boolean) => void;
}

export const documentStore = createStore<DocumentState>(set => ({
  documents: [],
  selectedDocument: null,
  isUploading: false,
  isLoading: false,
  setDocuments: documents => set({ documents }),
  setSelectedDocument: document => set({ selectedDocument: document }),
  setIsUploading: uploading => set({ isUploading: uploading }),
  setIsLoading: loading => set({ isLoading: loading }),
}));

export const useDocument = <T>(selector: (state: DocumentState) => T) =>
  useStore(documentStore, selector);
