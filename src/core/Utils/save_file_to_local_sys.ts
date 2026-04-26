import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Express, Request, Response } from "express";
import AppError from "../errors/app_errors";
import { StatusCodes } from "http-status-codes";
import catchAsync from "./catch_async";
import sendResponse from "./send_response";
import {
  deleteFileFromCloudinary,
  uploadFileToCloudinary,
} from "./upload_file_cloudinary";

interface SaveFileOptions {
  folder: string; // e.g. "store_items"
}

export const saveFileToLocal = async (
  file: Express.Multer.File,
  options: SaveFileOptions,
): Promise<string> => {
  const uploadsRoot = path.join(process.cwd(), "public/uploads");
  const targetDir = path.join(uploadsRoot, options.folder);

  // Ensure directory exists
  await fs.promises.mkdir(targetDir, { recursive: true });

  const extension = path.extname(file.originalname);
  const fileName = `${crypto.randomUUID()}${extension}`;
  const filePath = path.join(targetDir, fileName);

  // Write buffer to disk
  await fs.promises.writeFile(filePath, file.buffer);

  // Public URL
  return `/uploads/${options.folder}/${fileName}`;
};

export const deleteLocalFile = async (fileUrl: string): Promise<boolean> => {
  try {
    // Prevent deleting arbitrary system files
    if (!fileUrl.startsWith("/uploads/")) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid file URL");
    }

    const uploadsRoot = path.join(process.cwd(), "public");
    const filePath = path.join(uploadsRoot, fileUrl);

    // Check if file exists
    await fs.promises.access(filePath);

    // Delete file
    await fs.promises.unlink(filePath);

    return true;
  } catch (error: any) {
    // File not found → treat as already deleted
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const saveToLocalFileApiFunction = catchAsync(
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw new AppError(StatusCodes.BAD_REQUEST, "File is required");
    const uploadUrl = await saveFileToLocal(file!, {
      folder: "room_photo",
    });
    sendResponse(res, {
      success: true,
      message: "Successfully uploaded file",
      result: uploadUrl,
      statusCode: StatusCodes.OK,
    });
  },
);

export const uploadFileCloudFunction = catchAsync(
  async (req: Request, res: Response) => {
    const { folder } = req.body;
    if (!folder)
      throw new AppError(StatusCodes.BAD_REQUEST, "Folder is required");
    const file = req.file;
    if (!file) throw new AppError(StatusCodes.BAD_REQUEST, "File is required");
    const uploadUrl = await uploadFileToCloudinary({ file: file!, folder });
    sendResponse(res, {
      success: true,
      message: "Successfully uploaded file",
      result: uploadUrl,
      statusCode: StatusCodes.OK,
    });
  },
);

export const deleteFileApiFunction = catchAsync(
  async (req: Request, res: Response) => {
    const { fileUrl } = req.body;
    if (!fileUrl)
      throw new AppError(StatusCodes.BAD_REQUEST, "File URL is required");
    const isDeleted = await deleteFileFromCloudinary(fileUrl);
    sendResponse(res, {
      success: true,
      message: "Successfully deleted file",
      result: isDeleted,
      statusCode: StatusCodes.OK,
    });
  },
);
