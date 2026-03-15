export async function extractTextFromResume(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // Dynamic require to handle pdf-parse's non-standard exports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const parse = typeof pdfParse === "function" ? pdfParse : pdfParse.default ?? pdfParse.PDFParse;

    if (typeof parse === "function") {
      try {
        // Try as callable function (pdf-parse v1 API)
        const result = await parse(buffer);
        return result.text ?? "";
      } catch {
        // Fall through to class-based API
      }
    }

    // Class-based API (pdf-parse v2+)
    if (pdfParse.PDFParse) {
      const instance = new pdfParse.PDFParse({ data: new Uint8Array(buffer) });
      const doc = await instance.getDocument();
      let text = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: Record<string, unknown>) => item.str ?? "").join(" ") + "\n";
      }
      return text;
    }

    throw new Error("Unable to parse PDF: incompatible pdf-parse version");
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require("mammoth");
    const extract = mammoth.extractRawText ?? mammoth.default?.extractRawText;
    const result = await extract({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
