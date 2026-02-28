import { RankingPeriods } from "../../core/Utils/enums";
import { IGiftRecordRepository } from "../../repository/gifts/gift_record_repository";

export interface IRankingService {
  getSenderRanking(myId: string, period: RankingPeriods): Promise<any>;
  getReceiverRanking(myId: string, period: RankingPeriods): Promise<any>;
  getRoomRanking(myId: string, period: RankingPeriods): Promise<any>;
}

export class RankingService implements IRankingService {
  GiftRecordRepository: IGiftRecordRepository;
  constructor(giftRecordRepository: IGiftRecordRepository) {
    this.GiftRecordRepository = giftRecordRepository;
  }

  async getSenderRanking(myId: string, period: RankingPeriods): Promise<any> {
    try {
      
    } catch (error) {
      
    }
  }

  async getReceiverRanking(myId: string, period: RankingPeriods): Promise<any> {
    try {
      
    } catch (error) {
      
    }
  }

  async getRoomRanking(myId: string, period: RankingPeriods): Promise<any> {
    try {
      
    } catch (error) {
      
    }
  }
}
