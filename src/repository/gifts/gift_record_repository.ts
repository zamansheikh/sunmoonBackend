import {
  IGIftRecord,
  IGiftRecordModel,
} from "../../models/gifts/gift_record_model";

export interface IGiftRecordRepository {
  createGiftRecord(giftRecord: IGIftRecord): Promise<boolean>;
}

export class GiftRecordRepository implements IGiftRecordRepository {
  Model: IGiftRecordModel;
  constructor(model: IGiftRecordModel) {
    this.Model = model;
  }
  async createGiftRecord(giftRecord: IGIftRecord): Promise<boolean> {
    try {
      // determine ttl -> always currents months last date. 
      const currentMonthLastDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        0,
      );
      const newGiftRecord = new this.Model({
        ...giftRecord,
        expireAt: currentMonthLastDate,
      });
      await newGiftRecord.save();
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  }
}
