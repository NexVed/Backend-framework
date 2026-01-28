/**
 * User by ID Route
 */

import { Request, Response } from 'express';
import { success, notFound, noContent } from '../../../../utils/response';

export const GET = async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: Fetch user from database
  const user = {
    id,
    name: 'Example User',
    email: 'user@example.com',
    createdAt: new Date().toISOString(),
  };

  if (!user) {
    return notFound(res, 'User');
  }

  return success(res, user);
};

export const PUT = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email } = req.body;

  // TODO: Update user in database
  const updatedUser = {
    id,
    name,
    email,
    updatedAt: new Date().toISOString(),
  };

  return success(res, updatedUser);
};

export const DELETE = async (req: Request, res: Response) => {
  const { id } = req.params;

  // TODO: Delete user from database

  return noContent(res);
};
