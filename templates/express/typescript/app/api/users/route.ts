/**
 * Users Route
 */

import { Request, Response } from 'express';
import { success, created } from '../../../utils/response';

export const GET = async (req: Request, res: Response) => {
    // TODO: Fetch users from database
    const users: any[] = [];

    return success(res, users);
};

export const POST = async (req: Request, res: Response) => {
    const { name, email } = req.body;

    // TODO: Create user in database
    const newUser = {
        id: '1',
        name,
        email,
        createdAt: new Date().toISOString(),
    };

    return created(res, newUser);
};
