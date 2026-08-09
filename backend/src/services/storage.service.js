const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { promises: fs } = require("fs");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");

let s3Client;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.storage.s3.region,
      credentials: {
        accessKeyId: config.storage.s3.accessKeyId || "",
        secretAccessKey: config.storage.s3.secretAccessKey || "",
      },
    });
  }
  return s3Client;
}

function extFromName(name, mime) {
  const m = name.match(/\.[a-zA-Z0-9]+$/);
  if (m) return m[0].toLowerCase();
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".bin";
}

async function saveLocal(input) {
  const folder = input.folder || "uploads/general";
  const safeFolder = folder.replace(/[^a-zA-Z0-9_\-/]/g, "").replace(/^\/|\.\./g, "");
  const id = crypto.randomBytes(12).toString("hex");
  const ext = extFromName(input.originalName, input.mimeType);
  const fileName = `${id}${ext}`;
  const dest = path.join(process.cwd(), "public", safeFolder, fileName);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, input.buffer);
  return {
    url: `/${safeFolder}/${fileName}`,
    key: `${safeFolder}/${fileName}`,
    size: input.buffer.length,
    mimeType: input.mimeType,
  };
}

async function saveS3(input) {
  const folder = input.folder || "uploads/general";
  const safeFolder = folder.replace(/[^a-zA-Z0-9_\-/]/g, "").replace(/^\/|\.\./g, "");
  const id = crypto.randomBytes(12).toString("hex");
  const ext = extFromName(input.originalName, input.mimeType);
  const key = `${safeFolder}/${id}${ext}`;

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
      Body: input.buffer,
      ContentType: input.mimeType,
    })
  );

  const url = `https://${config.storage.s3.bucket}.s3.${config.storage.s3.region}.amazonaws.com/${key}`;
  return { url, key, size: input.buffer.length, mimeType: input.mimeType };
}

async function uploadFile(input) {
  if (config.storage.driver === "s3") return saveS3(input);
  return saveLocal(input);
}

async function deleteFile(key) {
  if (config.storage.driver === "s3") {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.storage.s3.bucket,
        Key: key,
      })
    );
    return;
  }
  const filePath = path.join(process.cwd(), "public", key);
  await fs.unlink(filePath).catch(() => {});
}

async function getPresignedUrl(key, expiresIn = 3600) {
  if (config.storage.driver === "s3") {
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: config.storage.s3.bucket,
      Key: key,
    });
    return getSignedUrl(client, command, { expiresIn });
  }
  return `/${key}`;
}

module.exports = { uploadFile, deleteFile, getPresignedUrl };
