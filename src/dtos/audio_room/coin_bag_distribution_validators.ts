import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { ICoinBagDistribution, IDataPoint } from "../../models/audio_room/coin_bag_distribution_model";
import { validateNumber } from "../sotre/store_validators";

function validateDataPoints(dataPoints: any): IDataPoint[] {
  if (!Array.isArray(dataPoints) || dataPoints.length < 1) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "dataPoints must be a non-empty array",
    );
  }

  return dataPoints.map((dp: any, index: number) => {
    if (typeof dp !== "object" || dp === null) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `dataPoints[${index}] must be an object`,
      );
    }
    if (dp.rank === undefined || dp.rank === null) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `dataPoints[${index}].rank is required`,
      );
    }
    if (dp.percentage === undefined || dp.percentage === null) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `dataPoints[${index}].percentage is required`,
      );
    }
    validateNumber(dp.rank, `dataPoints[${index}].rank`);
    validateNumber(dp.percentage, `dataPoints[${index}].percentage`);

    if (Number(dp.percentage) > 100) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `dataPoints[${index}].percentage must be between 0 and 100`,
      );
    }

    return {
      rank: Number(dp.rank),
      percentage: Number(dp.percentage),
    };
  });
}

export function validateCreateCoinBagDistribution(body: any): ICoinBagDistribution {
  const { totalUsers, dataPoints } = body;

  if (totalUsers === undefined || totalUsers === null) {
    throw new AppError(StatusCodes.BAD_REQUEST, "totalUsers is required");
  }
  if (dataPoints === undefined || dataPoints === null) {
    throw new AppError(StatusCodes.BAD_REQUEST, "dataPoints is required");
  }

  validateNumber(totalUsers, "totalUsers");
  const validatedDataPoints = validateDataPoints(dataPoints);

  return {
    totalUsers: Number(totalUsers),
    dataPoints: validatedDataPoints,
  };
}

export function validateUpdateCoinBagDistribution(body: any): ICoinBagDistribution {
  const { totalUsers, dataPoints } = body;

  if (totalUsers === undefined || totalUsers === null) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "totalUsers is required to identify the distribution to update",
    );
  }
  if (dataPoints === undefined || dataPoints === null) {
    throw new AppError(StatusCodes.BAD_REQUEST, "dataPoints is required");
  }

  validateNumber(totalUsers, "totalUsers");
  const validatedDataPoints = validateDataPoints(dataPoints);

  return {
    totalUsers: Number(totalUsers),
    dataPoints: validatedDataPoints,
  };
}
