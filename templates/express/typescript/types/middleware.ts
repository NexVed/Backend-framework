import { Request, Response, NextFunction } from "express";

export type Middleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => any;

export type Handler = (
  req: Request,
  res: Response,
  next?: NextFunction
) => any;

export type RouteExport = Handler | Array<Middleware | Handler>;
