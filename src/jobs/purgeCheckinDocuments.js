const cron = require('node-cron');
const CheckIn = require('../modules/checkins/model');
const logger = require('../config/logger');

async function purgeDocuments(now = new Date()) {
  const result = await CheckIn.updateMany(
    { documentDeleteAt: { $lte: now }, documentEncrypted: { $exists: true } },
    {
      $unset: { documentEncrypted: '', documentIv: '', documentTag: '', documentMime: '' },
      $set: { documentDeletedAt: now },
    },
  );
  if (result.modifiedCount) logger.info('Expired identity documents purged', { count: result.modifiedCount });
  return result.modifiedCount;
}

let task = null;
function start() {
  if (task) return task;
  task = cron.schedule('0 3 * * *', () => {
    purgeDocuments().catch(error => logger.error('Identity document purge failed', { message: error.message }));
  }, { timezone: 'Africa/Lagos' });
  return task;
}

module.exports = { purgeDocuments, start };
