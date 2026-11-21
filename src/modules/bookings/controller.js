const bookingService = require("./service");

const createBooking = async (req, res, next) => {
    try {
        const booking = await bookingService.createBooking(
            req.validated.body,
            req.user._id
        );

        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            data: booking,
        });
    } catch (error) {
        return next(error);
    }
};

const getMyBookings = async (req, res, next) => {
    try {
        const bookings = await bookingService.getMyBookings(
            req.user._id
        );

        return res.status(200).json({
            success: true,
            message: "Bookings retrieved successfully",
            data: bookings,
        });
    } catch (error) {
        return next(error);
    }
};

const getAllBookings = async (req, res, next) => {
    try {
        const bookings = await bookingService.getAllBookings();

        return res.status(200).json({
            success: true,
            message: "All bookings retrieved successfully",
            data: bookings,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createBooking,
    getMyBookings,
    getAllBookings
};