import {
  IFamily,
  IFamilyDocument,
  IFamilyModel,
} from "../../models/family/family_model";

export interface IFamilyRepository {
  create(data: IFamily): Promise<IFamilyDocument>;
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
}
