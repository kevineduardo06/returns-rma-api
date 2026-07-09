export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export const notFound = (message: string) => new AppError(404, message);
export const badRequest = (message: string) => new AppError(400, message);
export const forbidden = (message: string) => new AppError(403, message);
