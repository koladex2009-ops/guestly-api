const { z } = require('zod');
const { image } = require('../hotels/validation');

const date = z.iso.date();
const roomFields = {
  name: z.string().trim().min(2).max(80),
  category: z.enum(['Standard', 'Deluxe', 'Executive']),
  image,
  nightlyRate: z.number().int().min(1).max(100000000),
  capacity: z.number().int().min(1).max(3),
  size: z.number().positive().max(10000),
  bed: z.string().trim().min(2).max(80),
  view: z.string().trim().min(2).max(80),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30),
  description: z.string().trim().min(2).max(1200),
  inventory: z.number().int().min(0).max(1000),
  featured: z.boolean(),
};

const createRoomSchema = z.object({ body: z.strictObject(roomFields) });
const updateRoomSchema = z.object({
  params: z.object({ slug: z.string().regex(/^[a-z0-9-]{2,110}$/) }),
  body: z.strictObject(roomFields).partial().refine(value => Object.keys(value).length > 0, 'Provide a field to update'),
});
const roomSlugSchema = z.object({
  params: z.object({ slug: z.string().regex(/^[a-z0-9-]{2,110}$/) }),
});
const availabilitySchema = z.object({
  query: z.object({
    checkIn: date,
    checkOut: date,
    guests: z.coerce.number().int().min(1).max(3),
  }).refine(value => value.checkIn < value.checkOut, 'Check-out must be after check-in'),
});

module.exports = { createRoomSchema, updateRoomSchema, roomSlugSchema, availabilitySchema };
