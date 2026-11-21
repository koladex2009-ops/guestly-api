const hotelService = require("./service");

const createHotel = async (req, res, next) => {
    try {
        const hotel = await hotelService.createHotel(req.validated.body);

        return res.status(201).json({
            success: true,
            message: "Hotel created successfully",
            data: hotel,
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    createHotel,
};