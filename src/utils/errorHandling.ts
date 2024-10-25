enum HttpStatusCode {
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: HttpStatusCode, message: string) {
      super(message);
      this.statusCode = statusCode;
      Object.setPrototypeOf(this, new.target.prototype); // to avoid errors when extending built-in classes
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
      super(HttpStatusCode.BAD_REQUEST, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
      super(HttpStatusCode.NOT_FOUND, message);
  }
}

export class InternalServerError extends HttpError {
  constructor(message: string) {
      super(HttpStatusCode.INTERNAL_SERVER_ERROR, message);
  }
}

export class CustomError extends InternalServerError {
  constructor(message: string, statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR) {
      super(message);
      this.statusCode = statusCode; // Only set if different from default
  }
}

export class ConversionError extends CustomError {
  constructor(message = "Error during conversion") {
      super(message);
  }
}

export class DownloadError extends CustomError {
  constructor(message = "Error during download process") {
      super(message);
  }
}

export class DeletionError extends CustomError {
  constructor(message = "Error deleting the video") {
      super(message);
  }
}

export function handleUncaughtErrors(server: any) {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    if (server?.listening) {
      server.close(() => {
        process.kill(process.pid, 'SIGTERM');
      });
    }
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    if (server?.listening) {
      server.close(() => {
        process.kill(process.pid, 'SIGTERM');
      });
    }
  });
}

