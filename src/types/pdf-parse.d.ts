declare module 'pdf-parse/lib/pdf-parse' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
    text: string;
  }
  
  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}
