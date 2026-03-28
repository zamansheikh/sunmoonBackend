import { Model } from "mongoose";
import {
  IFamilyJoinRequest,
  IFamilyJoinRequestDocument,
  IFamilyJoinRequestModel,
} from "../../models/family/family_join_request_model";
import { StatusTypes } from "../../core/Utils/enums";

export interface IFamilyJoinRequestRepository {
  create(
    data: IFamilyJoinRequest,
    session?: any,
  ): Promise<IFamilyJoinRequestDocument>;
  findByUser(
    userId: string,
    familyId: string,
    status?: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument | null>;
  getByUserId(userId: string): Promise<IFamilyJoinRequestDocument | null>;
  findAllByFamily(
    familyId: string,
    status?: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument[]>;
  updateStatus(
    requestId: string,
    status: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument | null>;
  findById(
    requestId: string,
    session?: any,
  ): Promise<IFamilyJoinRequestDocument | null>;
  delete(
    requestId: string,
    session?: any,
  ): Promise<IFamilyJoinRequestDocument | null>;
}

export class FamilyJoinRequestRepository
  implements IFamilyJoinRequestRepository
{
  model: IFamilyJoinRequestModel;

  constructor(model: IFamilyJoinRequestModel) {
    this.model = model;
  }

  async create(
    data: IFamilyJoinRequest,
    session?: any,
  ): Promise<IFamilyJoinRequestDocument> {
    const request = new this.model(data);
    return await request.save({ session });
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

  async getByUserId(userId: string): Promise<IFamilyJoinRequestDocument | null> {
    return await this.model.findOne({ userId });
  }

  async findById(
    requestId: string,
    session?: any,
  ): Promise<IFamilyJoinRequestDocument | null> {
    return await this.model.findById(requestId).session(session);
  }

  async delete(
    requestId: string,
    session?: any,
  ): Promise<IFamilyJoinRequestDocument | null> {
    return await this.model.findByIdAndDelete(requestId).session(session);
  }

  async findAllByFamily(
    familyId: string,
    status?: StatusTypes,
  ): Promise<IFamilyJoinRequestDocument[]> {
    const query: any = { familyId };
    if (status) query.status = status;
    return await this.model.find(query).populate("userId").sort("-createdAt");
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
