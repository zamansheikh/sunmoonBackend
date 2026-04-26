import { StatusCodes } from "http-status-codes";
import cloudinary from "../config/cloudaniay_config";
import AppError from "../errors/app_errors";
import { getCloudinaryPublicId } from "./helper_functions";

export const uploadFileToCloudinary = ({
  file,
  folder = "user_profiles",
}: {
  file: Express.Multer.File;
  folder?: string;
}) => {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(file.buffer);
  });
};

export const deleteFileFromCloudinary = async (
  url: string,
): Promise<boolean> => {
  try {
    const publicId = getCloudinaryPublicId(url);
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");
    const resourceType = parts[2]; // This extracts 'image', 'video', or 'raw' from the URL path

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    if (result.result == "not found")
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "File not found");
    if (result.result != "ok")
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "File deletion failed",
      );
    return result.result === "ok";
  } catch (error: any) {
    throw new AppError(
      error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
      error.message || "File Deletion failed",
    );
  }
};
