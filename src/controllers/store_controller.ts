import { Request, Response } from "express";
import catchAsync from "../core/Utils/catch_async";
import { IPremiumFiles, IStoreService } from "../services/store/store_service";
import sendResponse from "../core/Utils/send_response";
import {
  isImageFile,
  isSvgaFile,
  validateFieldExistance,
} from "../core/Utils/helper_functions";
import { StatusCodes } from "http-status-codes";
import AppError from "../core/errors/app_errors";
import {
  validateCreateStoreItem,
  ValidateStoreItemBatch,
  ValidateStoreItemUpdateBatch,
  validateUpdateStoreItem,
} from "../dtos/sotre/store_validators";

export default class StoreController {
  Service: IStoreService;
  constructor(service: IStoreService) {
    this.Service = service;
  }

  //   📌 store categories
  createCategory = catchAsync(async (req: Request, res: Response) => {
    const { title, isPremium } = req.body;
    validateFieldExistance(title, "title");
    const category = await this.Service.createCategory(title, isPremium);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  updateCategory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title } = req.body;
    validateFieldExistance(title, "title");
    validateFieldExistance(id, "_id");
    const category = await this.Service.updateCategory(id, title);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  getAllCategories = catchAsync(async (req: Request, res: Response) => {
    const categories = await this.Service.getAllCategories();
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: categories,
    });
  });

  getCategoryById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const category = await this.Service.getCategoryById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  deleteCategory = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const category = await this.Service.deleteCategory(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: category,
    });
  });

  categoryDeleteEffectedItems = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const items = await this.Service.categoryDeleteEffectedItems(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  // 📌 store items
  createStoreItemSingle = catchAsync(async (req: Request, res: Response) => {
    validateCreateStoreItem(req.body);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const svgaFile = files["svgaFile"]?.[0];
    const previewFile = files["previewFile"]?.[0];

    validateFieldExistance(svgaFile, "svgaFile");
    validateFieldExistance(previewFile, "previewFile");

    if (!isSvgaFile(svgaFile!.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "svgaFile must be a .svga file");
    }
    if (!isImageFile(previewFile!.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "previewFile must be an image");
    }

    const { name, validity, categoryId, price } = req.body;
    const item = await this.Service.createStoreItemSingle(
      { name, validity, categoryId, price },
      svgaFile!,
      previewFile!,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  
  createStoreItemBatch = catchAsync(async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    ValidateStoreItemBatch(req.body, files);
    const { name, validity, categoryId, price, categoryNames } = req.body;

    const svgaFiles = files["svgaFile"] || [];
    const previewFiles = files["previewFile"] || [];

    let categories = categoryNames.split(",");
    categories = categories.map((cat: string) => cat.trim());
    let premiumFiles: IPremiumFiles[] = [];
    for (let i = 0; i < svgaFiles.length; i++) {
      if (!isSvgaFile(svgaFiles[i].originalname)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `svgaFile[${i}] must be a .svga file`,
        );
      }
      if (!isImageFile(previewFiles[i].originalname)) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `previewFile[${i}] must be an image`,
        );
      }
      premiumFiles.push({
        categoryName: categories[i],
        svgaFile: svgaFiles[i],
        previewFile: previewFiles[i],
      });
    }
    const item = await this.Service.createStoreItemBatch(
      { name, validity, categoryId, price },
      premiumFiles,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getStoreItemById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const item = await this.Service.getStoreItemById(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getAllStoreItems = catchAsync(async (req: Request, res: Response) => {
    const { category } = req.params;
    const { query } = req;
    validateFieldExistance(category, "categoryId");
    const items = await this.Service.getAllStoreItems(category, query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  updateStoreItemSingle = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    validateUpdateStoreItem(req.body);
    const { name, validity, categoryId, price } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const svgaFile = files?.["svgaFile"]?.[0];
    const previewFile = files?.["previewFile"]?.[0];

    if (svgaFile && !isSvgaFile(svgaFile.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "svgaFile must be a .svga file");
    }
    if (previewFile && !isImageFile(previewFile.originalname)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "previewFile must be an image");
    }

    const item = await this.Service.updateStoreItemSingle(
      id,
      { name, validity, categoryId, price },
      svgaFile,
      previewFile,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  updateStoreItemBatch = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    ValidateStoreItemUpdateBatch(req.body, files);
    const { name, validity, categoryId, price, categoryNames } = req.body;
    let premiumFiles: IPremiumFiles[] = [];

    if (categoryNames) {
      let names = categoryNames.split(",");
      names = names.map((cat: string) => cat.trim());
      const svgaFiles = files["svgaFile"] || [];
      const previewFiles = files["previewFile"] || [];
      for (let i = 0; i < svgaFiles.length; i++) {
        if (!isSvgaFile(svgaFiles[i].originalname)) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `svgaFile[${i}] must be a .svga file`,
          );
        }
        if (!isImageFile(previewFiles[i].originalname)) {
          throw new AppError(
            StatusCodes.BAD_REQUEST,
            `previewFile[${i}] must be an image`,
          );
        }
        premiumFiles.push({
          categoryName: names[i],
          svgaFile: svgaFiles[i],
          previewFile: previewFiles[i],
        });
      }
    }

    const item = await this.Service.updateStoreItemBatch(
      id,
      { name, validity, categoryId, price },
      premiumFiles,
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getEffectedBucketSummary = catchAsync(async (req: Request, res: Response) => {
    const { itemId } = req.params;
    validateFieldExistance(itemId, "itemId");
    const summary = await this.Service.getEffectedBucketSummary(itemId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: summary,
    });
  });

  deleteStoreItem = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateFieldExistance(id, "_id");
    const item = await this.Service.deleteStoreItem(id);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  changeItemCategory = catchAsync(async (req: Request, res: Response) => {
    const { category } = req.params;
    const { itemId } = req.body;
    validateFieldExistance(itemId, "itemId");
    validateFieldExistance(category, "category");
    const item = await this.Service.changeItemCategory(itemId, category);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  //  📌 my buckets

  buyStoreItem = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { itemId } = req.body;
    validateFieldExistance(itemId, "itemId");
    const item = await this.Service.buyStoreItem(id, itemId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });

  getMyBucket = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { category } = req.params;
    validateFieldExistance(category, "category");
    const items = await this.Service.getMyBucket(id, category, req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: items,
    });
  });

  useGiftItem = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.user!;
    const { bucketId } = req.body;
    validateFieldExistance(bucketId, "bucketId");
    const item = await this.Service.userGiftItem(id, bucketId);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      result: item,
    });
  });
}
