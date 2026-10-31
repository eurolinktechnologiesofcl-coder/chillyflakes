import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** API error rendered as { code, message, fieldErrors? } — the contract the frontend normalises. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
    public extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

export const badRequest = (message: string, fieldErrors?: Record<string, string[]>) =>
  new ApiError(400, 'validation_error', message, fieldErrors);

export function zodToFieldErrors(err: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || 'non_field_errors';
    (out[key] ||= []).push(issue.message);
  }
  return out;
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ code: 'not_found', message: 'Endpoint not found.' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      code: err.code,
      message: err.message,
      ...(err.fieldErrors ? { fieldErrors: err.fieldErrors } : {}),
      ...(err.extra || {}),
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'validation_error',
      message: 'Please correct the highlighted fields.',
      fieldErrors: zodToFieldErrors(err),
    });
    return;
  }
  if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.parse.failed') {
    res.status(400).json({ code: 'invalid_json', message: 'Malformed JSON body.' });
    return;
  }
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'MulterError') {
    const multerErr = err as { code?: string; message?: string };
    if (multerErr.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({ code: 'file_too_large', message: 'File size exceeds maximum allowed limit of 5 MB.' });
      return;
    }
    res.status(400).json({ code: 'upload_error', message: multerErr.message || 'File upload error.' });
    return;
  }
  console.error('[error]', err);
  res.status(500).json({ code: 'server_error', message: 'Something went wrong on our side. Please try again.' });
}
