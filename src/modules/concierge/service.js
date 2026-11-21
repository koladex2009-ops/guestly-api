const Message = require('./model');
const User = require('../users/model');
const AppError = require('../../utils/AppError');

function serialize(item) {
  const value = item.toObject ? item.toObject() : item;
  return {
    id: String(value._id), guestId: String(value.guest),
    sender: value.sender, senderName: value.senderName, text: value.text,
    createdAt: new Date(value.createdAt).toISOString(),
  };
}

async function submit(guestId, text, actor) {
  const own = actor.role === 'guest';
  if (own && String(actor._id) !== String(guestId)) throw new AppError('Conversation not found', 404);
  let guest = actor;
  if (!own) {
    guest = await User.findById(guestId);
    if (!guest || guest.role !== 'guest' || !guest.isActive) throw new AppError('Guest conversation not found', 404);
    const existing = await Message.exists({ guest: guest._id });
    if (!existing) throw new AppError('Guest conversation not found', 404);
  }
  const saved = await Message.create({
    guest: guest._id,
    guestName: [guest.firstName, guest.lastName].filter(Boolean).join(' '),
    sender: actor.role,
    senderUser: actor._id,
    senderName: [actor.firstName, actor.lastName].filter(Boolean).join(' '),
    text,
  });
  return serialize(saved);
}

async function messages(guestId, { page, limit }) {
  const filter = { guest: guestId };
  const [items, total] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Message.countDocuments(filter),
  ]);
  return { items: items.reverse().map(serialize), total, page, limit };
}

async function conversations({ page, limit }) {
  const result = await Message.aggregate([
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: {
      _id: '$guest',
      guestName: { $first: '$guestName' },
      sender: { $first: '$sender' },
      lastText: { $first: '$text' },
      updatedAt: { $first: '$createdAt' },
    } },
    { $sort: { updatedAt: -1, _id: 1 } },
    { $facet: {
      items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      total: [{ $count: 'value' }],
    } },
  ]);
  const grouped = result[0] || { items: [], total: [] };
  return {
    items: grouped.items.map(item => ({
      guestId: String(item._id), guestName: item.guestName,
      sender: item.sender, lastText: item.lastText,
      updatedAt: new Date(item.updatedAt).toISOString(),
      waiting: item.sender === 'guest',
    })),
    total: grouped.total[0]?.value || 0, page, limit,
  };
}

module.exports = { serialize, submit, messages, conversations };
