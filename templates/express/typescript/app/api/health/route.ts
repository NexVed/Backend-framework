/**
 * Health Check Route
 */

import { Request, Response } from 'express';
import { db } from '../../../database';

export const GET = async (req: Request, res: Response) => {
  const dbHealth = await db.healthCheck();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    databases: dbHealth,
  });
};