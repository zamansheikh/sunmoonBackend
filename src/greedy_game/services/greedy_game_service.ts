import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import {
  IWalletTransaction,
  IWalletTransactionDocument,
} from "../models/wallet_transaction_model";
import { IWalletTransactionRepository } from "../repository/wallet_transaction_repository";

export interface IDebitRequest {
  userId: string;
  currency: string;
  amount: number;
  type: string;
  idempotencyKey: string;
  description: string;
  refType: string;
  refId: string;
}

export interface IGreedyGameService {
  getUserBalance(userId: string): Promise<{ coins: number; diamonds: number; frozen: boolean }>;
  debit(data: IDebitRequest): Promise<{ txn: { id: string } }>;
}

export default class GreedyGameService implements IGreedyGameService {
  UserStatsRepo: IUserStatsRepository;
  WalletTransactionRepo: IWalletTransactionRepository;

  constructor(
    UserStatsRepo: IUserStatsRepository,
    WalletTransactionRepo: IWalletTransactionRepository,
  ) {
    this.UserStatsRepo = UserStatsRepo;
    this.WalletTransactionRepo = WalletTransactionRepo;
  }

  async getUserBalance(userId: string): Promise<{ coins: number; diamonds: number; frozen: boolean }> {
    const userStats = await this.UserStatsRepo.getUserStats(userId);

    if (!userStats) {
      throw new AppError(StatusCodes.NOT_FOUND, "User stats not found");
    }

    return {
      coins: userStats.coins ?? 0,
      diamonds: userStats.diamonds ?? 0,
      frozen: false,
    };
  }

  async debit(data: IDebitRequest): Promise<{ txn: { id: string } }> {
    try {
      const transaction = await this.WalletTransactionRepo.create({
        userId: data.userId,
        currency: data.currency,
        amount: data.amount,
        type: data.type,
        idempotencyKey: data.idempotencyKey,
        description: data.description,
        refType: data.refType,
        refId: data.refId,
      });

      return {
        txn: {
          id: (transaction._id as any).toString(),
        },
      };
    } catch (error: any) {
      if (error.code === 11000) {
        throw new AppError(StatusCodes.CONFLICT, "Transaction already exists");
      }
      throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to create transaction");
    }
  }
}
