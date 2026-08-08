import LevelRewardClaimModel, {
  ILevelRewardClaim,
  ILevelRewardClaimDocument,
  ILevelRewardClaimModel,
} from "../../models/levelReward/level_reward_claim_model";

export interface ILevelRewardClaimRepository {
  create(data: ILevelRewardClaim): Promise<ILevelRewardClaimDocument>;
  findByUserAndLevel(userId: string, level: number): Promise<ILevelRewardClaimDocument | null>;
  findByUserId(userId: string): Promise<ILevelRewardClaimDocument[]>;
}

export default class LevelRewardClaimRepository implements ILevelRewardClaimRepository {
  Model: ILevelRewardClaimModel;

  constructor(Model: ILevelRewardClaimModel) {
    this.Model = Model;
  }

  async create(data: ILevelRewardClaim): Promise<ILevelRewardClaimDocument> {
    const claim = new this.Model(data);
    return await claim.save();
  }

  async findByUserAndLevel(userId: string, level: number): Promise<ILevelRewardClaimDocument | null> {
    return await this.Model.findOne({ userId, level });
  }

  async findByUserId(userId: string): Promise<ILevelRewardClaimDocument[]> {
    return await this.Model.find({ userId }).sort({ level: 1 });
  }
}
