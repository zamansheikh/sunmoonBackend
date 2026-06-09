import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { PrivilegeTypes } from "../../core/Utils/enums";

export function validateCreateStoreItem(body: any) {
  const { name, validity, categoryId, price, privilege } = body;
  if (!name || !validity || !categoryId || !price)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, validity, categoryId, price are required",
    );
  validateNumber(validity, "validity");
  validateNumber(price, "price");
  if (privilege) {
    validatePrivileges(privilege);
  }
}
export function validateUpdateStoreItem(body: any) {
  const { name, categoryId, prices, privilege } = body;
  if (!name && !categoryId && !prices && !privilege && body.canUserBuyThis === undefined)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, categoryId, prices, privilege or canUserBuyThis at least one is required",
    );
  if (prices) {
    validatePrices(prices);
  }
  if (privilege) {
    validatePrivileges(privilege);
  }
}

export function ValidateStoreItemBatch(
  body: any,
  files: {
    svgaFile?: Express.Multer.File[];
    previewFile?: Express.Multer.File[];
    logo?: Express.Multer.File[];
  },
) {
  const { name, categoryId, prices, categoryNames, privilege } = body;
  if (!name || !categoryId || !prices)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, categoryId, prices, privilege are required",
    );
  if (privilege) {
    validatePrivileges(privilege);
  }

  //check if prices is the right type of IPrices
  validatePrices(prices);

  const nameParts = name.split("-");
  if (nameParts[0] === "VIP" || nameParts[0] === "SVIP") {
    if (nameParts.length !== 2 || isNaN(Number(nameParts[1]))) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "VIP or SVIP names must include a valid numeric level suffix, e.g., VIP-1 or SVIP-3",
      );
    }
  }

  // svgaFile and previewFile are each independently optional. The client
  // sends per-row presence masks (svgaFlags / previewFlags) so the backend
  // can map the flattened multer arrays back to category indices. We
  // validate the mask shape here; the controller does the row-by-row
  // alignment.
  const { svgaFile, previewFile } = files;
  const svgaCount = svgaFile?.length ?? 0;
  const previewCount = previewFile?.length ?? 0;
  if (svgaCount < 1 && previewCount < 1)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Each bundle category needs at least one of svgaFile or previewFile",
    );

  const categories = categoryNames.split(",");
  validateBundleFlagsAgainstFiles(
    body.svgaFlags,
    "svgaFlags",
    "svgaFile",
    categories.length,
    svgaCount,
  );
  validateBundleFlagsAgainstFiles(
    body.previewFlags,
    "previewFlags",
    "previewFile",
    categories.length,
    previewCount,
  );
}

/**
 * Each flag string is comma-separated "1"/"0" with one entry per category,
 * where "1" means a file was attached for that row. The 1-count must match
 * the multer file array length for the corresponding field. Backward-
 * compatible: when the flag string is missing, accept the legacy contract
 * that the file array length must equal the category count.
 */
function validateBundleFlagsAgainstFiles(
  rawFlags: unknown,
  flagsField: string,
  filesField: string,
  categoryCount: number,
  fileCount: number,
) {
  if (typeof rawFlags !== "string" || rawFlags.length === 0) {
    if (fileCount > 0 && fileCount !== categoryCount) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `categoryNames and ${filesField} must be the same length when ${filesField}s are provided`,
      );
    }
    return;
  }
  const flags = rawFlags.split(",");
  if (flags.length !== categoryCount) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${flagsField} must have one entry per category (got ${flags.length}, expected ${categoryCount})`,
    );
  }
  const presentCount = flags.filter((f) => f === "1").length;
  if (presentCount !== fileCount) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${flagsField} marks ${presentCount} files but ${filesField} array has ${fileCount}`,
    );
  }
}

export function ValidateStoreItemUpdateBatch(
  body: any,
  files: {
    svgaFile?: Express.Multer.File[];
    previewFile?: Express.Multer.File[];
    logo?: Express.Multer.File[];
  },
) {
  const { name, categoryId, prices, categoryNames, privilege } = body;
  if (!name && !categoryId && !prices)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "name, categoryId, prices at least one is required",
    );
  if (privilege) {
    validatePrivileges(privilege);
  }
  if (prices) {
    validatePrices(prices);
  }

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

export function validateArray(arr: any, fieldName: string) {
  let parsedArr = arr;
  if (typeof arr === "string") {
    try {
      parsedArr = JSON.parse(arr);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${fieldName} must be a valid JSON string or array`,
      );
    }
  }

  if (!Array.isArray(parsedArr))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be an array`,
    );
  if (parsedArr.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} cannot be empty`);
}

export function validateNumberArray(arr: any, fieldName: string) {
  let parsedArr = arr;
  if (typeof arr === "string") {
    try {
      parsedArr = JSON.parse(arr);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `${fieldName} must be a valid JSON string or array`,
      );
    }
  }

  if (!Array.isArray(parsedArr))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be an array`,
    );
  if (parsedArr.length < 1)
    throw new AppError(StatusCodes.BAD_REQUEST, `${fieldName} cannot be empty`);
  parsedArr.forEach((item: any) => {
    validateNumber(item, fieldName);
  });
}

export function validateNumber(num: any, fieldName: string) {
  if (isNaN(Number(num)))
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a number`,
    );
  if (Number(num) < 0)
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `${fieldName} must be a positive number`,
    );
}

export function validatePrices(prices: any) {
  let parsedPrices = prices;
  if (typeof prices === "string") {
    try {
      parsedPrices = JSON.parse(prices);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "prices must be a valid JSON string or array",
      );
    }
  }

  if (!Array.isArray(parsedPrices)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "prices must be an array");
  }

  parsedPrices.forEach((p: any) => {
    if (typeof p !== "object" || p === null) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Each price item must be an object",
      );
    }
    if (p.validity === undefined || p.price === undefined) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Each price must have validity and price",
      );
    }
    validateNumber(p.validity, "validity");
    validateNumber(p.price, "price");
  });
}
export function validatePrivileges(privileges: any) {
  let parsedPrivileges = privileges;
  if (typeof privileges === "string") {
    try {
      parsedPrivileges = JSON.parse(privileges);
    } catch (error) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "privilege must be a valid JSON string or array",
      );
    }
  }

  if (!Array.isArray(parsedPrivileges)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "privilege must be an array");
  }

  // If empty array, it's fine (as per model default)
  if (parsedPrivileges.length === 0) return;

  const validPrivileges = Object.values(PrivilegeTypes) as string[];
  parsedPrivileges.forEach((p: any) => {
    if (!validPrivileges.includes(p)) {
      throw new AppError(StatusCodes.BAD_REQUEST, `Invalid privilege: ${p}`);
    }
  });
}
