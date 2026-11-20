const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../modules/users/model");

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, env.JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: "Invalid or inactive user"
            });
        }
        req.user = user;

        return next();

    } catch (error) {
        if (error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        return next(error);
    }
};

module.exports = auth;

