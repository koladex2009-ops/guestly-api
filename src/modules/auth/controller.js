const User = require("../users/model");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");



const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password } = req.validated.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered"
            });
        }

        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
        });

        return res.status(201).json({
            success:true,
            message: "Account created successfully",
            data: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        return next(error);
    }
};


const login = async (req, res, next) => {
    try {
        const { email, password } = req.validated.body;
        
        const user = await User.findOne({ email }).select("+password");
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role
            },
            env.JWT_SECRET,
            {
                expiresIn: env.JWT_EXPIRES_IN
            }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                }
            }
        });

    } catch (error) {
        return next(error);
    }
};

const getMe = async (req, res, next) => {
    try {
        return res.status(200).json({
            success: true,
            message: "User profile retrieved successfully",
            data: {
                id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                role: req.user.role,
            }
        });
    } catch (error) {
       return next(error); 
    }
}
module.exports = {
    register,
    login,
    getMe,
};
