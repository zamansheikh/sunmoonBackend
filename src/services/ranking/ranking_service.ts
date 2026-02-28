import { UserCache } from "../../core/cache/user_chache";
import AppError from "../../core/errors/app_errors";
import { RankingPeriods } from "../../core/Utils/enums";
import { IGiftRecordRepository } from "../../repository/gifts/gift_record_repository";

export interface IRankingResponse {
  ranking: any[];
  myRanking: {
    amount: number;
    memberDetails: any;
    rank: number | string;
  };
}

export interface IRankingService {
  getSenderRanking(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRankingResponse>;
  getReceiverRanking(myId: string, period: RankingPeriods): Promise<any>;
  getRoomRanking(myId: string, period: RankingPeriods): Promise<any>;
}

export class RankingService implements IRankingService {
  GiftRecordRepository: IGiftRecordRepository;
  constructor(giftRecordRepository: IGiftRecordRepository) {
    this.GiftRecordRepository = giftRecordRepository;
  }

  async getSenderRanking(
    myId: string,
    period: RankingPeriods,
  ): Promise<IRankingResponse> {
    const user = UserCache.getInstance().validateUserId(myId);
    if (!user) throw new AppError(404, "User not found");

    // execute independent queries in parallel to reduce latency
    const [ranking, myRankingDetails] = await Promise.all([
      this.GiftRecordRepository.getSenderRanking(period),
      this.GiftRecordRepository.getMySendAmount(myId, period),
    ]);

    // Find index once instead of using .some() and .findIndex()
    const myIndex = ranking.findIndex(
      (ranking) => ranking.memberDetails._id.toString() === myId,
    );

    const myRanking = {
      amount: myRankingDetails.amount,
      memberDetails: myRankingDetails.memberDetails,
      rank:
        myIndex !== -1
          ? myIndex + 1
          : ranking.length >= 100
            ? "100+"
            : ranking.length + 1,
    };

    return { ranking, myRanking };
  }

  async getReceiverRanking(myId: string, period: RankingPeriods): Promise<any> {
    try {
    } catch (error) {}
  }

  async getRoomRanking(myId: string, period: RankingPeriods): Promise<any> {
    try {
    } catch (error) {}
  }
}
