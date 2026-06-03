export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly detail?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autorizado", detail?: string) {
    super(401, "UNAUTHORIZED", message, detail);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "No tienes permisos para esta acción", detail?: string) {
    super(403, "FORBIDDEN", message, detail);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Recurso", detail?: string) {
    super(404, "NOT_FOUND", `${resource} no encontrado`, detail);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Datos inválidos", detail?: string) {
    super(400, "VALIDATION_ERROR", message, detail);
  }
}

export class ConflictError extends AppError {
  constructor(message = "El recurso ya existe", detail?: string) {
    super(409, "CONFLICT", message, detail);
  }
}
