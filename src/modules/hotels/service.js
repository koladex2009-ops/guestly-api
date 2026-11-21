const Hotel = require("./model");

const createHotel = async (hotelData) => {
    const hotel = await Hotel.create(hotelData);

    return hotel;
};

module.exports = {
    createHotel,
};
