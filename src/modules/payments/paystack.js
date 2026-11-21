const axios = require('axios');
const crypto = require('node:crypto');
const env = require('../../config/env');

const paystack = axios.create({ baseURL: 'https://api.paystack.co', timeout: 15000 });

function authHeaders() {
  if (!env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return { Authorization: 'Bearer ' + env.PAYSTACK_SECRET_KEY };
}

function generateReference() {
  return 'GST-' + Date.now() + '-' + crypto.randomBytes(6).toString('hex');
}

async function initializeTransaction({ email, amount, reference, callbackUrl, metadata }) {
  const { data } = await paystack.post(
    '/transaction/initialize',
    { email, amount, reference, callback_url: callbackUrl, metadata },
    { headers: authHeaders() },
  );
  return data.data;
}

async function verifyTransaction(reference) {
  const { data } = await paystack.get(
    '/transaction/verify/' + encodeURIComponent(reference),
    { headers: authHeaders() },
  );
  return data.data;
}

async function createRefund(reference) {
  const { data } = await paystack.post(
    '/refund',
    { transaction: reference },
    { headers: authHeaders() },
  );
  return data.data;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!signature || !/^[0-9a-fA-F]{128}$/.test(signature) || !env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

module.exports = { generateReference, initializeTransaction, verifyTransaction, createRefund, verifyWebhookSignature };
