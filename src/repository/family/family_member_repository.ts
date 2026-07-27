import { Types } from "mongoose";
import { IFamilyMember, IFamilyMemberDocument, IFamilyMemberModel } from "../../models/family/family_member_model";
import { DatabaseNames, FamilyMemberRole } from "../../core/Utils/enums";
import { IPagination } from "../../core/Utils/query_builder";

export interface IFamilyMemberRepository {
  create(data: IFamilyMember, session?: any): Promise<IFamilyMemberDocument>;
  getByUserId(userId: string): Promise<IFamilyMemberDocument | null>;
  update(
    userId: string,
    data: Partial<IFamilyMember>,
  ): Promise<IFamilyMemberDocument | null>;
  delete(userId: string, session?: any): Promise<IFamilyMemberDocument | null>;
  countByRole(familyId: string | any, role: string): Promise<number>;
  incrementContribution(
    userId: string,
    familyId: string,
    amount: number,
  ): Promise<void>;
  getTopContributors(
    familyId: string,
    limit: number,
  ): Promise<IFamilyMemberDocument[]>;
  getLeader(
    familyId: string,
  ): Promise<IFamilyMemberDocument | null>;
  getMembersByRole(
    familyId: string,
    role: string,
    limit: number,
    random?: boolean,
  ): Promise<IFamilyMemberDocument[]>;
  getAllMemberUserIds(familyId: string): Promise<string[]>;
  getAllMembersPaginated(
    familyId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; members: IFamilyMemberDocument[] }>;
}

export class FamilyMemberRepository implements IFamilyMemberRepository {
  model: IFamilyMemberModel;

  constructor(model: IFamilyMemberModel) {
    this.model = model;
  }
  async create(
    data: IFamilyMember,
    session?: any,
  ): Promise<IFamilyMemberDocument> {
    const familyMember = new this.model(data);
    return await familyMember.save({ session });
  }
  async getByUserId(userId: string): Promise<IFamilyMemberDocument | null> {
    return await this.model.findOne({ userId });
  }

  async update(
    userId: string,
    data: Partial<IFamilyMember>,
  ): Promise<IFamilyMemberDocument | null> {
    return await this.model.findOneAndUpdate({ userId }, data, { new: true });
  }

  async delete(
    userId: string,
    session?: any,
  ): Promise<IFamilyMemberDocument | null> {
    return await this.model.findOneAndDelete({ userId }).session(session);
  }

  async countByRole(familyId: string | any, role: string): Promise<number> {
    return await this.model.countDocuments({ familyId, role });
  }

  async incrementContribution(
    userId: string,
    familyId: string,
    amount: number,
  ): Promise<void> {
    await this.model.updateOne(
      { userId, familyId },
      { $inc: { giftsReceived: amount } },
    );
  }

  async getTopContributors(
    familyId: string,
    limit: number,
  ): Promise<IFamilyMemberDocument[]> {
    return await this.model
      .find({ familyId })
      .sort({ giftsReceived: -1 })
      .limit(limit)
      .populate("userId", "name _id avatar");
  }

  async getLeader(
    familyId: string,
  ): Promise<IFamilyMemberDocument | null> {
    return await this.model
      .findOne({ familyId })
      .where("role")
      .equals(FamilyMemberRole.Leader)
      .populate("userId", "name _id avatar");
  }

  async getMembersByRole(
    familyId: string,
    role: FamilyMemberRole,
    limit: number,
    random: boolean = false,
  ): Promise<IFamilyMemberDocument[]> {
    if (random) {
      return await this.model.aggregate([
        { $match: { familyId: new Types.ObjectId(familyId), role } },
        { $sample: { size: limit } },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId",
            pipeline: [{ $project: { name: 1, _id: 1, avatar: 1 } }],
          },
        },
        { $unwind: "$userId" },
      ]);
    }

    return await this.model
      .find({ familyId, role })
      .limit(limit)
      .populate("userId", "name _id avatar");
  }

  async getAllMemberUserIds(familyId: string): Promise<string[]> {
    const members = await this.model
      .find({ familyId })
      .select("userId")
      .lean();
    return members.map((m) => m.userId.toString());
  }

  async getAllMembersPaginated(
    familyId: string,
    query: Record<string, any>,
  ): Promise<{ pagination: IPagination; members: IFamilyMemberDocument[] }> {
    const matchStage: any = { familyId: new Types.ObjectId(familyId) };

    if (query.role) {
      const roles = query.role.split(",").map((r: string) => r.trim());
      matchStage.role = { $in: roles };
    }

    if (query.minGifts || query.maxGifts) {
      const giftFilter: any = {};
      if (query.minGifts) giftFilter.$gte = Number(query.minGifts);
      if (query.maxGifts) giftFilter.$lte = Number(query.maxGifts);
      matchStage.giftsReceived = giftFilter;
    }

    if (query.joinedFrom || query.joinedTo) {
      const dateFilter: any = {};
      if (query.joinedFrom) dateFilter.$gte = new Date(query.joinedFrom);
      if (query.joinedTo) dateFilter.$lte = new Date(query.joinedTo);
      matchStage.createdAt = dateFilter;
    }

    const limit = Number(query.limit || 20);
    const page = Number(query.page || 1);
    const skip = (page - 1) * limit;

    const countPipeline: any[] = [{ $match: matchStage }, { $count: "total" }];
    const countResult = await this.model.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    const dataPipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: DatabaseNames.User,
          localField: "userId",
          foreignField: "_id",
          as: "userId",
          pipeline: [
            { $project: { name: 1, _id: 1, avatar: 1, level: 1, currentLevelTag: 1 } },
          ],
        },
      },
      { $unwind: "$userId" },
    ];

    const sortBy = query.sortBy || "role";
    const sortOrder = query.sortOrder === "desc" ? -1 : 1;

    if (sortBy === "role") {
      const roleOrder: Record<string, number> = {
        [FamilyMemberRole.Leader]: 0,
        [FamilyMemberRole.CoLeader]: 1,
        [FamilyMemberRole.Elder]: 2,
        [FamilyMemberRole.Member]: 3,
      };
      dataPipeline.push({
        $addFields: {
          roleOrder: {
            $switch: {
              branches: Object.entries(roleOrder).map(([role, order]) => ({
                case: { $eq: ["$role", role] },
                then: order,
              })),
              default: 99,
            },
          },
        },
      });
      dataPipeline.push({ $sort: { roleOrder: sortOrder, giftsReceived: -1 } });
      dataPipeline.push({ $project: { roleOrder: 0 } });
    } else {
      const sortField = sortBy === "joinedAt" ? "createdAt" : sortBy;
      dataPipeline.push({ $sort: { [sortField]: sortOrder } });
    }

    dataPipeline.push({ $skip: skip }, { $limit: limit });

    const members = await this.model.aggregate(dataPipeline);

    return {
      pagination: {
        total,
        limit,
        page,
        totalPage: Math.ceil(total / limit),
      },
      members: members as any,
    };
  }
}
