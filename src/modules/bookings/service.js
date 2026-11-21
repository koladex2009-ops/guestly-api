const Booking = require("./model");
const Room = require("../rooms/model");
const RoomNight = require("./roomNight.model");
const crypto = require("crypto");

const releaseExpiredBookings = async (roomId) => {
    const now = new Date();
    
    const expiredBookings = await Booking.find({
        room: roomId,
        status: "pending",
        expiresAt: { $lte: now },
    }).select("_id");

    if (expiredBookings.length === 0) {
        return;
    }

    const bookingIds = expiredBookings.map(
        (booking) => booking._id
    );
    
    await RoomNight.deleteMany({
        booking: { $in: bookingIds },
    });
    
    await Booking.updateMany(
    {
        _id: { $in: bookingIds },
        status: "pending",
    },
    { $set: { status: "expired" } }
);
};


const createBooking = async (bookingData, guestId) => {
    const { room, checkIn, checkOut, guests } = bookingData;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (
        Number.isNaN(checkInDate.getTime()) ||
        Number.isNaN(checkOutDate.getTime()) ||
        checkOutDate <= checkInDate
    ) {
        const error = new Error("Check-out date must be after check-in date");
        error.statusCode = 400;
        throw error;
    }
    
    const selectedRoom = await Room.findOne({
        _id: room,
        isActive: true,
    });
    if (!selectedRoom) {
        const error = new Error("Room not found or unavailable");
        error.statusCode = 404;
        throw error;
    }

    await releaseExpiredBookings(room);
    
    if (guests > selectedRoom.capacity) {
        const error = new Error("Number of guests exceeds room capacity");
        error.statusCode = 400;
        throw error;
    }    


const millisecondsPerDay = 1000 * 60 * 60 * 24;

const normalizedCheckIn = Date.UTC(
    checkInDate.getUTCFullYear(),
    checkInDate.getUTCMonth(),
    checkInDate.getUTCDate()
);

const normalizedCheckOut = Date.UTC(
    checkOutDate.getUTCFullYear(),
    checkOutDate.getUTCMonth(),
    checkOutDate.getUTCDate()
);

if (normalizedCheckOut <= normalizedCheckIn) {
    const error = new Error("Check-out date must be at least one day after check-in date");
    error.statusCode = 400;
    throw error;
}

const nights = (normalizedCheckOut - normalizedCheckIn) / millisecondsPerDay;

const totalAmount = selectedRoom.pricePerNight * nights;

if (!Number.isSafeInteger(totalAmount)) {
    const error = new Error("Booking amount is invalid");
    error.statusCode = 400;
    throw error;
}

    const reference = `GS-${new Date().getFullYear()}-NG-${crypto
    .randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

const booking = await Booking.create({
    reference,
    guest: guestId,
    room,
    checkIn: new Date(normalizedCheckIn),
    checkOut: new Date(normalizedCheckOut),
    nights,
    guests,
    totalAmount,
    expiresAt,
});

const roomNights = [];

for (
    let date = normalizedCheckIn;
    date < normalizedCheckOut;
    date += millisecondsPerDay
) {
    roomNights.push({
        room,
        booking: booking._id,
        date: new Date(date),
    });
}
try {
    await RoomNight.insertMany(roomNights);
} catch (error) {

    await RoomNight.deleteMany({ booking: booking._id });

    await Booking.findByIdAndDelete(booking._id);

    if (error.code === 11000) {
        const conflictError = new Error(
            "This room is already reserved for one or more selected dates"
        );
        conflictError.statusCode = 409;
        throw conflictError;
    }

    throw error;
}
return booking;
};

const getMyBookings = async (guestId) => {
    const bookings = await Booking.find({
        guest: guestId,
    })
        .populate("room")
        .sort({ createdAt: -1 });
    

    return bookings;
};

const getAllBookings = async () => {
    const bookings = await Booking.find()
        .populate("guest", "firstName lastName email")
        .populate("room")
        .sort({ createdAt: -1 });

    return bookings;
};

module.exports = {
    createBooking,
    getMyBookings,
    getAllBookings
};