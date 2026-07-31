import SvipConfigModel, {
  ISvipConfig,
  ISvipConfigDocument,
  ISvipConfigModel,
} from "../../models/admin/svip_config_model";

export interface ISvipConfigRepository {
  getConfig(): Promise<ISvipConfigDocument | null>;
  updateConfig(data: Partial<ISvipConfig>): Promise<ISvipConfigDocument>;
}

export class SvipConfigRepository implements ISvipConfigRepository {
  private Model: ISvipConfigModel;

  constructor(model: ISvipConfigModel) {
    this.Model = model;
  }

  async getConfig(): Promise<ISvipConfigDocument | null> {
    return await this.Model.findOne();
  }

  async updateConfig(data: Partial<ISvipConfig>): Promise<ISvipConfigDocument> {
    // Field-by-field $set to prevent accidental field erasure.
    // Only fields present in `data` are updated — everything else is untouched.
    const update: Record<string, any> = {};
    if (data.vipTiers !== undefined) update.vipTiers = data.vipTiers;
    if (data.svipTiers !== undefined) update.svipTiers = data.svipTiers;
    if (data.retentionThreshold !== undefined) update.retentionThreshold = data.retentionThreshold;
    if (data.vipCategoryName !== undefined) update.vipCategoryName = data.vipCategoryName;
    if (data.svipCategoryName !== undefined) update.svipCategoryName = data.svipCategoryName;

    return (await this.Model.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true },
    )) as ISvipConfigDocument;
  }
}
