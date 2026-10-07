/** Throw an HttpError anywhere and the error handler turns it into JSON: { "error": "..." } */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Please log in first.", code?: string) => new HttpError(401, message, code);
export const forbidden = (message = "You don't have access to this.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
