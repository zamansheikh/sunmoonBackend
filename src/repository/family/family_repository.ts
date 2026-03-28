import {
  IFamily,
  IFamilyDocument,
  IFamilyModel,
} from "../../models/family/family_model";

export interface IFamilyRepository {
  create(data: IFamily): Promise<IFamilyDocument>;
  getByLeaderId(leaderId: string): Promise<IFamilyDocument | null>;
  getById(id: string): Promise<IFamilyDocument | null>;
  update(
    id: string,
    data: Partial<IFamily>,
  ): Promise<IFamilyDocument | null>;
}

export class FamilyRepository implements IFamilyRepository {
  model: IFamilyModel;

  constructor(model: IFamilyModel) {
    this.model = model;
  }
  async create(data: IFamily): Promise<IFamilyDocument> {
    const family = new this.model(data);
    return await family.save();
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
  ): Promise<IFamilyDocument | null> {
    return await this.model.findByIdAndUpdate(id, data, { new: true });
  }
}
