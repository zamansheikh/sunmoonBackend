import {
  IFamily,
  IFamilyDocument,
  IFamilyModel,
} from "../../models/family/family_model";

export interface IFamilyRepository {
  create(data: IFamily, session?: any): Promise<IFamilyDocument>;
  getByLeaderId(leaderId: string): Promise<IFamilyDocument | null>;
  getById(id: string): Promise<IFamilyDocument | null>;
  update(
    id: string,
    data: Partial<IFamily>,
    session?: any,
  ): Promise<IFamilyDocument | null>;
  incrementMemberCount(
    id: string,
    amount?: number,
    session?: any,
  ): Promise<IFamilyDocument | null>;
}

export class FamilyRepository implements IFamilyRepository {
  model: IFamilyModel;

  constructor(model: IFamilyModel) {
    this.model = model;
  }
  async create(data: IFamily, session?: any): Promise<IFamilyDocument> {
    const family = new this.model(data);
    return await family.save({ session });
  }
  async getByLeaderId(leaderId: string): Promise<IFamilyDocument | null> {
    return await this.model.findOne({ leaderId });
  }
  async getById(id: string): Promise<IFamilyDocument | null> {
    return await this.model.findById(id);
  }
  async update(
    id: string,
    data: Partial<IFamily>,
    session?: any,
  ): Promise<IFamilyDocument | null> {
    return await this.model
      .findByIdAndUpdate(id, data, { new: true })
      .session(session);
  }

  async incrementMemberCount(
    id: string,
    amount: number = 1,
    session?: any,
  ): Promise<IFamilyDocument | null> {
    return await this.model
      .findByIdAndUpdate(
        id,
        { $inc: { memberCount: amount } },
        { new: true },
      )
      .session(session);
  }
}
