const { success } = require("zod");
const User = require("../users/model");

const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password} = req.validated;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: true,
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
            message: "Account created sucessfully",
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
}
module.exports = {
    register
};
