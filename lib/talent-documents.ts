import { inflateRawSync } from "node:zlib";
import { prisma } from "@/lib/db";
import { assertTalent, jobAccess, talentAdmin } from "@/lib/talent-access";
import { readFileBytes } from "@/lib/s3";

/** Inspect bytes, including bounded ZIP directory entries, without extracting files to disk. */
export function validateTalentDocumentBytes(
  bytes: Buffer,
  contentType: string,
): boolean {
  if (contentType === "application/pdf")
    return bytes.subarray(0, 5).toString() === "%PDF-";
  if (contentType === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (
    contentType !==
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return false;
  try {
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
      if (bytes.readUInt32LE(i) === 0x06054b50) {
        end = i;
        break;
      }
    if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6))
      return false;
    const count = bytes.readUInt16LE(end + 10),
      size = bytes.readUInt32LE(end + 12),
      start = bytes.readUInt32LE(end + 16);
    if (count > 2000 || start + size > end) return false;
    let position = start,
      expanded = 0;
    const entries = new Map<string, Buffer>();
    for (let i = 0; i < count; i++) {
      if (bytes.readUInt32LE(position) !== 0x02014b50) return false;
      const flags = bytes.readUInt16LE(position + 8),
        method = bytes.readUInt16LE(position + 10);
      const compressed = bytes.readUInt32LE(position + 20),
        uncompressed = bytes.readUInt32LE(position + 24);
      const nameLength = bytes.readUInt16LE(position + 28),
        extraLength = bytes.readUInt16LE(position + 30),
        commentLength = bytes.readUInt16LE(position + 32);
      const offset = bytes.readUInt32LE(position + 42),
        name = bytes
          .subarray(position + 46, position + 46 + nameLength)
          .toString("utf8");
      expanded += uncompressed;
      if (
        flags & 1 ||
        ![0, 8].includes(method) ||
        expanded > 50 * 1024 * 1024 ||
        name.includes("..") ||
        name.startsWith("/") ||
        /vbaProject|activeX|embeddings/i.test(name) ||
        entries.has(name)
      )
        return false;
      if (bytes.readUInt32LE(offset) !== 0x04034b50) return false;
      const contentStart =
        offset +
        30 +
        bytes.readUInt16LE(offset + 26) +
        bytes.readUInt16LE(offset + 28);
      if (contentStart + compressed > start) return false;
      const raw = bytes.subarray(contentStart, contentStart + compressed);
      const data =
        method === 8
          ? inflateRawSync(raw, {
              maxOutputLength: Math.min(50 * 1024 * 1024, uncompressed + 1),
            })
          : raw;
      if (data.length !== uncompressed) return false;
      entries.set(name, data);
      position += 46 + nameLength + extraLength + commentLength;
    }
    const contentTypes =
      entries.get("[Content_Types].xml")?.toString("utf8") || "";
    return (
      entries.has("word/document.xml") &&
      entries.has("_rels/.rels") &&
      contentTypes.includes(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
      ) &&
      !/macroEnabled|vbaProject/i.test(contentTypes)
    );
  } catch {
    return false;
  }
}
export async function validateTalentCloudDocument(
  objectKey: string,
  contentType: string,
  size: number,
) {
  assertTalent(
    size > 0 && size <= 10 * 1024 * 1024,
    400,
    "Document is too large",
  );
  const bytes = await readFileBytes(objectKey, 10 * 1024 * 1024);
  assertTalent(
    bytes.length === size && validateTalentDocumentBytes(bytes, contentType),
    400,
    "File content does not match an accepted document format",
  );
}
export async function canReadTalentAsset(userId: string, assetId: string) {
  const applications = await prisma.jobApplication.findMany({
    where: {
      redactedAt: null,
      status: { not: "WITHDRAWN" },
      OR: [{ resumeAssetId: assetId }, { attachmentIds: { has: assetId } }],
    },
    select: { jobId: true },
  });
  for (const application of applications) {
    try {
      await jobAccess(userId, application.jobId);
      return true;
    } catch {
      /* Check the next independent grant. */
    }
  }
  const verification = await prisma.talentHiringProfile.findFirst({
    where: { verificationAssetIds: { has: assetId } },
    select: { id: true },
  });
  if (verification) {
    try {
      await talentAdmin(userId);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
