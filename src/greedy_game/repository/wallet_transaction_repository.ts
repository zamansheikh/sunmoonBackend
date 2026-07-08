import {
  IWalletTransaction,
  IWalletTransactionDocument,
  IWalletTransactionModel,
} from "../models/wallet_transaction_model";

export interface IWalletTransactionRepository {
  create(data: IWalletTransaction): Promise<IWalletTransactionDocument>;
}

export default class WalletTransactionRepository implements IWalletTransactionRepository {
  Model: IWalletTransactionModel;

  constructor(Model: IWalletTransactionModel) {
    this.Model = Model;
  }

  async create(data: IWalletTransaction): Promise<IWalletTransactionDocument> {
    const transaction = new this.Model(data);
    return await transaction.save();
  }
}
