import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import AppError from "../../core/errors/app_errors";
import { UserRoles } from "../../core/Utils/enums";
import { IUserRepository } from "../../repository/users/user_repository";
import { IPagination } from "../../core/Utils/query_builder";
import { IUserDocument } from "../../models/user/user_model_interface";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { ICoinHistoryRepository } from "../../repository/coins/coinHistoryRepository";
import { ICoinHistory } from "../../models/coins/coinHistoryModel";

export interface IAppResellerService {
  updateUserRole(userId: string, newRole: UserRoles): Promise<{ id: string; userRole: string }>;
  getAllResellers(query: Record<string, unknown>): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }>;
  giveCoinsToUser(
    resellerId: string,
    userId: string,
    coins: number,
  ): Promise<{
    sender: { id: string; coins: number };
    receiver: { id: string; coins: number };
  }>;
}

export default class AppResellerService implements IAppResellerService {
  UserRepository: IUserRepository;
  UserStatsRepository: IUserStatsRepository;
  CoinHistoryRepository: ICoinHistoryRepository;

  constructor(
    UserRepository: IUserRepository,
    UserStatsRepository: IUserStatsRepository,
    CoinHistoryRepository: ICoinHistoryRepository,
  ) {
    this.UserRepository = UserRepository;
    this.UserStatsRepository = UserStatsRepository;
    this.CoinHistoryRepository = CoinHistoryRepository;
  }

  async getAllResellers(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    return this.UserRepository.getUserByRole(UserRoles.Reseller, query);
  }

  async updateUserRole(
    userId: string,
    newRole: UserRoles,
  ): Promise<{ id: string; userRole: string }> {
    const allowedRoles = [UserRoles.User, UserRoles.Reseller];
    if (!allowedRoles.includes(newRole)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Role can only be changed to "${UserRoles.User}" or "${UserRoles.Reseller}"`,
      );
    }

    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    if (!allowedRoles.includes(user.userRole as UserRoles)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot change role for users with role "${user.userRole}"`,
      );
    }

    if (user.userRole === newRole) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `User already has the role "${newRole}"`,
      );
    }

    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(userId, {
      userRole: newRole,
    });

    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update user role",
      );
    }

    return {
      id: updatedUser._id as string,
      userRole: updatedUser.userRole as string,
    };
  }

  async giveCoinsToUser(
    resellerId: string,
    userId: string,
    coins: number,
  ): Promise<{
    sender: { id: string; coins: number };
    receiver: { id: string; coins: number };
  }> {
    // ── 1. Validate inputs ────────────────────────────────────────────────────
    if (!coins || coins <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Coins must be greater than 0",
      );
    }

    if (resellerId === userId) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Self-transfer is not allowed",
      );
    }

    // ── 2. Fetch reseller (app user) ───────────────────────────────────────────
    const reseller = await this.UserRepository.findUserById(resellerId);
    if (!reseller) {
      throw new AppError(StatusCodes.NOT_FOUND, "Reseller not found");
    }
    if (reseller.userRole !== UserRoles.Reseller) {
      throw new AppError(
        StatusCodes.UNAUTHORIZED,
        "Only resellers can perform this action",
      );
    }

    // ── 3. Fetch target user ───────────────────────────────────────────────────
    const targetUser = await this.UserRepository.findUserById(userId);
    if (!targetUser) {
      throw new AppError(StatusCodes.NOT_FOUND, "Target user not found");
    }

    // ── 4. Execute transaction ─────────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedSender: { id: string; coins: number };
    let updatedReceiver: { id: string; coins: number };

    try {
      // Deduct coins from reseller's stats
      const senderAfterDeduction =
        await this.UserStatsRepository.balanceDeduction(
          resellerId,
          coins,
          session,
        );
      if (!senderAfterDeduction) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Failed to deduct coins from reseller",
        );
      }

      // Add coins to target user's stats
      const receiverStats = await this.UserStatsRepository.updateCoins(
        userId,
        coins,
        session,
      );

      // Create coin history record
      const historyObj: ICoinHistory = {
        senderRole: UserRoles.Reseller,
        senderId: resellerId,
        receiverRole: UserRoles.User,
        receiverId: userId,
        amount: coins,
      };
      await this.CoinHistoryRepository.createHistory(historyObj, session);

      await session.commitTransaction();

      updatedSender = {
        id: resellerId,
        coins: senderAfterDeduction.coins ?? 0,
      };
      updatedReceiver = {
        id: userId,
        coins: receiverStats.coins ?? 0,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return {
      sender: updatedSender,
      receiver: updatedReceiver,
    };
  }
}
