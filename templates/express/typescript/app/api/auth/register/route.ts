/**
 * Register Route
 */

import { Request, Response } from 'express';
import { created, badRequest, conflict } from '../../../../utils/response';
import { hashPassword, generateTokenPair } from '../../../../auth';

export const POST = async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return badRequest(res, 'Name, email, and password are required');
    }

    if (password.length < 8) {
        return badRequest(res, 'Password must be at least 8 characters');
    }

    // TODO: Check if user exists
    // const existing = await db.default().from('users').select('id').eq('email', email).single();
    // if (existing.data) {
    //   return conflict(res, 'Email already registered');
    // }

    // Hash password
    const passwordHash = await hashPassword(password);

    // TODO: Create user in database
    // const { data: user } = await db.default().from('users').insert({
    //   name,
    //   email,
    //   password: passwordHash,
    //   role: 'user',
    // }).select().single();

    // Mock user for demo
    const user = {
        id: '1',
        name,
        email,
        role: 'user',
        createdAt: new Date().toISOString(),
    };

    // Generate tokens
    const tokens = await generateTokenPair({
        id: user.id,
        email: user.email,
        role: user.role,
    });

    return created(res, {
        user,
        ...tokens,
    });
};
