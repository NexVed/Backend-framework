/**
 * Authentication Routes
 */

import { Request, Response } from 'express';
import { success, badRequest, unauthorized } from '../../../../utils/response';
import {
    generateTokenPair,
    hashPassword,
    comparePassword,
    verifyToken
} from '../../../../auth';

export const POST = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return badRequest(res, 'Email and password are required');
    }

    // TODO: Fetch user from database
    // const user = await db.default().from('users').select('*').eq('email', email).single();

    // Mock user for demo
    const user = {
        id: '1',
        email: 'user@example.com',
        password: await hashPassword('password123'),
        role: 'user',
    };

    // Verify password
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
        return unauthorized(res, 'Invalid email or password');
    }

    // Generate tokens
    const tokens = await generateTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    return success(res, {
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        ...tokens,
    });
};
