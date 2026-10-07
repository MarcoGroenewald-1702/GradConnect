import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validates req.body with a Zod schema (the same schemas the frontend forms use).
 * On success req.body is replaced with the cleaned-up data; on failure we answer 400.
 */
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      res.status(400).json({
        error: issue?.message ?? "Invalid request.",
        field: issue?.path.join("."),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
