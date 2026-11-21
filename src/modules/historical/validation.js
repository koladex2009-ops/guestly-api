const crypto = require('node:crypto');
const { z } = require('zod');

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
const sourceId = pattern => z.string().regex(pattern);
const positive = z.number().int().nonnegative().safe();
const minutes = z.number().int().min(0).max(100000);
const yesNo = z.enum(['Yes', 'No']);
const segment = z.enum(['Family', 'Group', 'Business', 'Couple', 'Solo']);
const paymentStatus = z.enum(['Successful', 'Refunded', 'Failed', 'Pending']);

const booking = z.strictObject({
  Booking_ID: sourceId(/^B\d{4,}$/), Guest_ID: sourceId(/^G\d{4,}$/),
  Booking_Date: date, Check_In: date, Check_Out: date,
  Stay_Length_Days: z.number().int().min(1).max(365),
  Guest_Segment: segment, Room_Type: z.enum(['Standard', 'Deluxe', 'Executive', 'Suite', 'Family']),
  Booking_Channel: z.string().trim().min(1).max(80),
  Booking_Status: z.enum(['Completed', 'Cancelled', 'Abandoned']),
  Payment_Status: paymentStatus,
  Nightly_Rate_NGN: positive, Room_Revenue_NGN: positive,
  Additional_Service_Revenue_NGN: positive, Total_Revenue_NGN: positive,
  Service_Request_Type: z.string().trim().min(1).max(80),
  Service_Response_Time_Min: minutes, Service_Resolution_Time_Min: minutes,
  Guest_Satisfaction_1_5: z.number().int().min(1).max(5),
  Returning_Guest: yesNo,
}).refine(row => {
  const nights = (Date.parse(row.Check_Out) - Date.parse(row.Check_In)) / 86400000;
  return nights === row.Stay_Length_Days &&
    row.Nightly_Rate_NGN * nights === row.Room_Revenue_NGN &&
    row.Room_Revenue_NGN + row.Additional_Service_Revenue_NGN === row.Total_Revenue_NGN;
}, 'Booking dates and revenue must reconcile');

const guest = z.strictObject({
  Guest_ID: sourceId(/^G\d{4,}$/), Guest_Segment: segment,
  Returning_Guest: yesNo, Country: z.string().min(2).max(80),
  Preferred_Service: z.string().min(2).max(80),
});
const payment = z.strictObject({
  Payment_ID: sourceId(/^P\d{4,}$/), Booking_ID: sourceId(/^B\d{4,}$/),
  Guest_ID: sourceId(/^G\d{4,}$/), Booking_Date: date,
  Payment_Status: paymentStatus, Total_Revenue_NGN: positive,
});
const service = z.strictObject({
  Request_ID: sourceId(/^SR\d{4,}$/), Booking_ID: sourceId(/^B\d{4,}$/),
  Guest_ID: sourceId(/^G\d{4,}$/), Service_Request_Type: z.string().min(2).max(80),
  Service_Response_Time_Min: minutes, Service_Resolution_Time_Min: minutes,
  Guest_Satisfaction_1_5: z.number().int().min(1).max(5),
  Request_Date: date,
});

const specs = {
  bookings: { schema: booking, id: 'Booking_ID' },
  guests: { schema: guest, id: 'Guest_ID' },
  payments: { schema: payment, id: 'Payment_ID' },
  'service-requests': { schema: service, id: 'Request_ID' },
};

function validateSources(sources) {
  const data = {};
  const issues = [];
  const rows = [];
  for (const [source, spec] of Object.entries(specs)) {
    if (!Array.isArray(sources[source])) throw new Error(source + ' must be an array');
    const sourceIds = new Set();
    data[source] = [];
    sources[source].forEach((input, index) => {
      const parsed = spec.schema.safeParse(input);
      if (!parsed.success) {
        issues.push(source + '[' + (index + 1) + ']: ' + parsed.error.issues.map(item => item.path.join('.') + ': ' + item.message).join(', '));
        return;
      }
      const value = parsed.data;
      const id = value[spec.id];
      if (source !== 'guests' && sourceIds.has(id)) {
        issues.push(source + '[' + (index + 1) + ']: duplicate source ID ' + id);
      }
      sourceIds.add(id);
      data[source].push(value);
      const rowKey = source === 'guests' ? id + ':row-' + (index + 1) : id;
      rows.push({
        source, rowKey, sourceId: id, sourceRow: index + 1, payload: value,
        hash: crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'),
      });
    });
  }
  if (issues.length) throw new Error('Historical data validation failed:\n' + issues.slice(0, 30).join('\n'));
  const bookings = new Map(data.bookings.map(row => [row.Booking_ID, row]));
  const guestIds = new Set(data.guests.map(row => row.Guest_ID));
  for (const row of data.bookings) {
    if (!guestIds.has(row.Guest_ID)) issues.push(row.Booking_ID + ': missing guest source ID');
  }
  for (const row of data.payments) {
    const linked = bookings.get(row.Booking_ID);
    if (!linked || linked.Guest_ID !== row.Guest_ID || linked.Booking_Date !== row.Booking_Date ||
      linked.Payment_Status !== row.Payment_Status || linked.Total_Revenue_NGN !== row.Total_Revenue_NGN) {
      issues.push(row.Payment_ID + ': booking/payment source values disagree');
    }
  }
  for (const row of data['service-requests']) {
    const linked = bookings.get(row.Booking_ID);
    if (!linked || linked.Guest_ID !== row.Guest_ID) issues.push(row.Request_ID + ': missing or mismatched booking');
  }
  if (issues.length) throw new Error('Historical data integrity failed:\n' + issues.slice(0, 30).join('\n'));

  const profiles = new Map();
  for (const row of data.guests) {
    const values = profiles.get(row.Guest_ID) || new Set();
    values.add(JSON.stringify(row));
    profiles.set(row.Guest_ID, values);
  }
  const conflictingGuestIds = [...profiles.values()].filter(values => values.size > 1).length;
  return {
    rows, data,
    summary: {
      rows: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.length])),
      distinctGuestIds: profiles.size,
      conflictingGuestIds,
      historicalPaymentStatuses: Object.fromEntries([...new Set(data.payments.map(row => row.Payment_Status))].map(status => [status, data.payments.filter(row => row.Payment_Status === status).length])),
      verifiedGatewayPayments: 0,
      importedLoyaltyPoints: 0,
    },
  };
}

module.exports = { validateSources, specs };
