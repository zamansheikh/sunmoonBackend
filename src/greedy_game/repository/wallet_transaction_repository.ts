import { ClientSession } from "mongoose";
import {
  IWalletTransaction,
  IWalletTransactionDocument,
  IWalletTransactionModel,
} from "../models/wallet_transaction_model";

export interface IWalletTransactionRepository {
  create(data: IWalletTransaction, session?: ClientSession): Promise<IWalletTransactionDocument>;
  findByIdempotencyKey(idempotencyKey: string): Promise<IWalletTransactionDocument | null>;
}

export default class WalletTransactionRepository implements IWalletTransactionRepository {
  Model: IWalletTransactionModel;

  constructor(Model: IWalletTransactionModel) {
    this.Model = Model;
  }

  async create(data: IWalletTransaction, session?: ClientSession): Promise<IWalletTransactionDocument> {
    const transaction = new this.Model(data);
    return await transaction.save({ session });
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<IWalletTransactionDocument | null> {
    return await this.Model.findOne({ idempotencyKey });
  }
}
