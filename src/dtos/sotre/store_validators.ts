import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";

export function validateCreateStoreItem(body: any) {
  const { name, validity, categoryId, price } = body;
  if (!name || !validity || !categoryId || !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required",
    );
  validateNumber(validity, "validity");
  validateNumber(price, "price");
}
export function validateUpdateStoreItem(body: any) {
  const { name, validity, categoryId, price } = body;
  if (!name && !validity && !categoryId && !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price at least one is required",
    );
  if (validity) validateNumber(validity, "validity");
  if (price) validateNumber(price, "price");
}

export function ValidateStoreItemBatch(
  body: any,
  files: { svgaFile?: Express.Multer.File[]; previewFile?: Express.Multer.File[] },
) {
  const { name, validity, categoryId, price, categoryNames } = body;
  if (!name || !validity || !categoryId || !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required",
    );
  validateNumber(validity, "validity");
  validateNumber(price, "price");

  if (name != "VIP" && !name.startsWith("SVIP"))
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid name");

  if (name.startsWith("SVIP")) {
    const parts = name.split("-");
    if (parts.length != 2)
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid name");
    validateNumber(parts[1], "SVIP level");
  }

  const { svgaFile, previewFile } = files;
  if (!svgaFile || svgaFile.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, "svgaFiles are required");
  if (!previewFile || previewFile.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, "previewFiles are required");

  const categories = categoryNames.split(",");
  if (categories.length !== svgaFile.length)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "categoryNames and svgaFiles must be the same length",
    );
  if (categories.length !== previewFile.length)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "categoryNames and previewFiles must be the same length",
    );
}

export function ValidateStoreItemUpdateBatch(
  body: any,
  files: { svgaFile?: Express.Multer.File[]; previewFile?: Express.Multer.File[] },
) {
  const { name, validity, categoryId, price, categoryNames } = body;
  if (!name && !validity && !categoryId && !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required",
    );
  if (validity) validateNumber(validity, "validity");
  if (price) validateNumber(price, "price");

  const { svgaFile, previewFile } = files;

  if (svgaFile && svgaFile.length != 0 && !categoryNames)
    throw new AppError(StatusCodes.BAD_REQUEST, "categoryNames are required");

  if (categoryNames) {
    const categories = categoryNames.split(",");
    if (svgaFile && categories.length !== svgaFile.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "categoryNames and svgaFiles must be the same length",
      );
    if (previewFile && categories.length !== previewFile.length)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "categoryNames and previewFiles must be the same length",
      );
  }
}

export function validateArray(arr: any) {
  if (!Array.isArray(arr))
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid array provided");
  if (arr.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, "Array cannot be empty");
}

export function validateNumber(num: any, filedName: string) {
  if (isNaN(Number(num)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${filedName} must be a number`,
    );
  if (num < 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${filedName} must be a number`,
    );
}
