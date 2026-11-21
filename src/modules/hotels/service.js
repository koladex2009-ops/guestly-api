const Hotel = require('./model');
const defaults = require('./defaults');

function serialize(hotel) {
  const value = hotel?.toObject ? hotel.toObject() : hotel;
  return { ...defaults, ...value, id: 'primary', currency: 'NGN', _id: undefined, key: undefined, __v: undefined };
}

async function getCurrentHotel() {
  const hotel = await Hotel.findOne({ key: 'primary' });
  return serialize(hotel);
}

async function updateCurrentHotel(fields) {
  const hotel = await Hotel.findOneAndUpdate(
    { key: 'primary' },
    { $set: fields, $setOnInsert: { key: 'primary' } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return serialize(hotel);
}

module.exports = { getCurrentHotel, updateCurrentHotel };
