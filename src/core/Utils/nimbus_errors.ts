import AppError from "../errors/app_errors";

export default class NimbusError extends AppError {
  public code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(statusCode, message);
    this.code = code;
  }
}
