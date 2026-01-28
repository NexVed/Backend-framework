/**
 * User by ID Route
 */

const GET = (req, res) => {
    res.json({
        success: true,
        data: {
            id: req.params.id,
            name: 'Example User',
            email: 'user@example.com',
        },
        message: 'User fetched',
    });
};

const PUT = (req, res) => {
    const { name, email } = req.body;

    res.json({
        success: true,
        data: { id: req.params.id, name, email },
        message: 'User updated',
    });
};

const DELETE = (req, res) => {
    res.json({
        success: true,
        data: { id: req.params.id },
        message: 'User deleted',
    });
};

module.exports = { GET, PUT, DELETE };
