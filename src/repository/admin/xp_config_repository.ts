import XpConfigModel, {
  IXpConfig,
  IXpConfigDocument,
  IXpConfigModel,
} from "../../models/admin/xp_config_model";

export interface IXpConfigRepository {
  /**
   * Fetches the single XP configuration document.
   */
  getConfig(): Promise<IXpConfigDocument | null>;

  /**
   * Updates or creates the XP configuration document.
   * @param data The configuration partial data to set.
   */
  updateConfig(data: Partial<IXpConfig>): Promise<IXpConfigDocument>;
}

export class XpConfigRepository implements IXpConfigRepository {
  private Model: IXpConfigModel;

  constructor(model: IXpConfigModel) {
    this.Model = model;
  }

  async getConfig(): Promise<IXpConfigDocument | null> {
    return await this.Model.findOne();
  }

  async updateConfig(data: Partial<IXpConfig>): Promise<IXpConfigDocument> {
    return (await this.Model.findOneAndUpdate(
      {}, // Match any (first document)
      { $set: data },
      { new: true, upsert: true },
    )) as IXpConfigDocument;
  }
}
