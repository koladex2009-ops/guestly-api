const crypto = require('node:crypto');
const multer = require('multer');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const types = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 2 * 1024 * 1024, fields: 3, fieldSize: 512 },
  fileFilter(req, file, callback) {
    if (!types.has(file.mimetype)) return callback(new AppError('Upload a JPEG, PNG or WebP ID image', 400));
    return callback(null, true);
  },
}).single('document');

function receive(req, res, next) {
  upload(req, res, error => {
    if (error?.code === 'LIMIT_FILE_SIZE') return next(new AppError('ID images must be under 2 MB', 413));
    if (error) return next(error instanceof AppError ? error : new AppError('Invalid ID document upload', 400));
    return next();
  });
}

function validImage(file) {
  if (!file || !Buffer.isBuffer(file.buffer) || !types.has(file.mimetype) || file.size > 2 * 1024 * 1024) return false;
  const data = file.buffer;
  if (file.mimetype === 'image/jpeg') return data.length > 3 && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (file.mimetype === 'image/png') return data.length > 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return data.length > 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP';
}

function encryptionKey() {
  const value = env.CHECKIN_DOCUMENT_KEY || '';
  const buffer = Buffer.from(value, 'base64');
  if (buffer.length !== 32 || buffer.toString('base64') !== value) {
    throw new AppError('Secure ID document storage is not configured', 503);
  }
  return buffer;
}

function encryptDocument(file) {
  if (!validImage(file)) throw new AppError('Upload a valid JPEG, PNG or WebP ID image', 400);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  return {
    documentMime: file.mimetype,
    documentEncrypted: Buffer.concat([cipher.update(file.buffer), cipher.final()]),
    documentIv: iv,
    documentTag: cipher.getAuthTag(),
  };
}

function decryptDocument(record) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), record.documentIv);
  decipher.setAuthTag(record.documentTag);
  return Buffer.concat([decipher.update(record.documentEncrypted), decipher.final()]);
}

module.exports = { receive, validImage, encryptDocument, decryptDocument };
