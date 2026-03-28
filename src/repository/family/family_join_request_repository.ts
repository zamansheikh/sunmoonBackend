import { Model } from "mongoose";
import {
  IFamilyJoinRequest,
  IFamilyJoinRequestDocument,
  IFamilyJoinRequestModel,
} from "../../models/family/family_join_request_model";
import { StatusTypes } from "../../core/Utils/enums";

export interface IFamilyJoinRequestRepository {
  create(data: IFamilyJoinRequest): Promise<IFamilyJoinRequestDocument>;
  findByUser(
    userId: string,
    familyId: string,
    status?: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument | null>;
  updateStatus(
    requestId: string,
    status: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument | null>;
}

export class FamilyJoinRequestRepository
  implements IFamilyJoinRequestRepository
{
  model: IFamilyJoinRequestModel;

  constructor(model: IFamilyJoinRequestModel) {
    this.model = model;
  }

  async create(data: IFamilyJoinRequest): Promise<IFamilyJoinRequestDocument> {
    const request = new this.model(data);
    return await request.save();
  }

  async findByUser(
    userId: string,
    familyId: string,
    status?: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument | null> {
    const query: any = { userId, familyId };
    if (status) query.status = status;
    return await this.model.findOne(query);
  }

  async updateStatus(
    requestId: string,
    status: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument | null> {
    return await this.model.findByIdAndUpdate(
      requestId,
      { status },
      { new: true },
    );
  }
}
