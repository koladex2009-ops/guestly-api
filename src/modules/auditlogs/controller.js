const AuditLog = require('./model');

async function list(req, res, next) {
  try {
    const { bookingId, page, limit } = req.validated.query;
    const filter = bookingId ? { booking: bookingId } : {};
    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLog.countDocuments(filter),
    ]);
    const data = {
      items: items.map(item => ({
        id: String(item._id),
        action: item.action,
        bookingId: item.booking ? String(item.booking) : null,
        paymentId: item.payment ? String(item.payment) : null,
        createdAt: item.createdAt,
      })),
      total, page, limit,
    };
    return res.status(200).json({ success: true, message: 'Audit records retrieved', data });
  } catch (error) { return next(error); }
}

module.exports = { list };
