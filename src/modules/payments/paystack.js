const axios = require('axios');
const crypto = require('crypto');
const env = require('../../config/env');

const paystack = axios.create({
  baseURL: 'https://api.paystack.co',
  timeout: 15000,
});

const authHeaders = () => {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not set');
  }
  return { Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` };
};

const generateReference = () =>
  `GST-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

// amount must be an integer in kobo
const initializeTransaction = async ({ email, amount, reference, callbackUrl, metadata }) => {
  const { data } = await paystack.post(
    '/transaction/initialize',
    { email, amount, reference, callback_url: callbackUrl, metadata },
    { headers: authHeaders() }
  );
  return data.data; // { authorization_url, access_code, reference }
};

const verifyTransaction = async (reference) => {
  const { data } = await paystack.get(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: authHeaders() }
  );
  return data.data; // includes status, amount, currency, paid_at, channel
};

// Paystack signs the raw request body with your secret key (HMAC SHA512)
const verifyWebhookSignature = (rawBody, signature) => {
  if (!signature || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto
    .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(signature, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { generateReference, initializeTransaction, verifyTransaction, verifyWebhookSignature };