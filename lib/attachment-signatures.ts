/**
 * Cheap file-header validation for the dormant Full attachment uploader.
 * This is NOT antivirus scanning and does not prove a ZIP/PDF is harmless.
 */
export function hasMatchingAttachmentSignature(content: Uint8Array, mime: string): boolean {
  if (!content.length) return false;
  switch (mime) {
    case "application/pdf":
      return content.length >= 5 &&
        content[0] === 0x25 && content[1] === 0x50 && content[2] === 0x44 &&
        content[3] === 0x46 && content[4] === 0x2d;
    case "image/png":
      return content.length >= 8 &&
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => content[i] === b);
    case "image/jpeg":
      return content.length >= 3 && content[0] === 0xff &&
        content[1] === 0xd8 && content[2] === 0xff;
    case "image/webp":
      return content.length >= 12 &&
        String.fromCharCode(...content.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...content.slice(8, 12)) === "WEBP";
    case "application/zip":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return content.length >= 4 && content[0] === 0x50 && content[1] === 0x4b &&
        ((content[2] === 0x03 && content[3] === 0x04) ||
         (content[2] === 0x05 && content[3] === 0x06));
    case "text/plain":
    case "text/csv":
      // Do not reject legitimate Windows-1252 CSV files. A null byte is
      // sufficient evidence this is not ordinary plain text.
      return !content.includes(0);
    default:
      return false;
  }
}
