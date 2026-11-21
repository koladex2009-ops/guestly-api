const { z } = require('zod');

const image = z.string().trim().max(600).refine(value =>
  /^\/images\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(value) ||
  /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/[a-zA-Z0-9/_.,-]+\.(jpg|jpeg|png|webp)$/.test(value),
  'Choose an existing hotel image or an uploaded photo',
);

const hotelFields = {
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().min(2).max(160),
  description: z.string().trim().min(2).max(1200),
  location: z.string().trim().min(2).max(160),
  heroImage: image,
};

const updateHotelSchema = z.object({
  body: z.strictObject(hotelFields).partial().refine(value => Object.keys(value).length > 0, 'Provide a field to update'),
});

module.exports = { image, updateHotelSchema };
