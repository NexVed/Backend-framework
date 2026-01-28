/**
 * Users Route
 */

const { success } = require('../../../utils');

const GET = (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Users list',
    });
};

const POST = async (req, res) => {
    const { name, email } = req.body;

    // TODO: Implement user creation

    res.status(201).json({
        success: true,
        data: { id: '1', name, email },
        message: 'User created',
    });
};

module.exports = { GET, POST };
