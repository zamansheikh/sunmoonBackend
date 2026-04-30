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
    const extension = file.originalname.split(".").pop()?.toLowerCase();

    // Standard media types that Cloudinary handles automatically (appending extensions in URLs)
    const standardMedia = ["jpg", "jpeg", "png", "gif", "webp", "svg", "mp4", "mov", "avi"];
    const isRaw = !extension || !standardMedia.includes(extension);

    const options: any = {
      folder,
      resource_type: "auto",
    };

    // For 'raw' files like SVGA, we must include the extension in the public_id
    // to ensure Cloudinary returns a URL with that extension.
    if (isRaw && extension) {
      const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
      options.public_id = `${uniqueId}.${extension}`;
      options.resource_type = "raw";
    }

    const stream = cloudinary.uploader.upload_stream(
      options,
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

    if (result.result == "not found") {
      console.warn(`[Cloudinary] File not found on Cloudinary: ${url}`);
      return true;
    }

    if (result.result != "ok") {
      console.error(
        `[Cloudinary] Deletion failed for ${url}. Result: ${result.result}`,
      );
      return false;
    }

    return result.result === "ok";
  } catch (error: any) {
    console.error(
      `[Cloudinary] Error during deletion for URL: ${url}. Error: ${error.message}`,
    );
    return false;
  }
};
