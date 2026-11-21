const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const supported = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!supported.has(file.mimetype)) return callback(new AppError('Upload a JPEG, PNG or WebP image', 400));
    return callback(null, true);
  },
}).single('image');

function verifySignature(file) {
  const { buffer, mimetype } = file;
  if (mimetype === 'image/jpeg') return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mimetype === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimetype === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

function receive(req, res, next) {
  upload(req, res, error => {
    if (error?.code === 'LIMIT_FILE_SIZE') return next(new AppError('Room photos must be under 2 MB', 413));
    if (error) return next(error);
    return next();
  });
}

async function storeImage(file) {
  if (!file || !verifySignature(file)) throw new AppError('Provide a valid JPEG, PNG or WebP photo', 400);
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError('Image storage is not configured', 503);
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'guestly/rooms', resource_type: 'image', format: supported.get(file.mimetype) },
      (error, result) => {
        if (error) return reject(new AppError('Unable to upload room photo', 502));
        return resolve({ url: result.secure_url });
      },
    );
    stream.end(file.buffer);
  });
}

module.exports = { receive, storeImage, verifySignature };
