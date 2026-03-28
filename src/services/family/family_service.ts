import { IFamily, IFamilyDocument } from "../../models/family/family_model";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IFamilyRepository } from "../../repository/family/family_repository";
import { IFamilyMemberRepository } from "../../repository/family/family_member_repository";
import {
  FamilyMemberRole,
  FamilyJoinMode,
  StatusTypes,
} from "../../core/Utils/enums";
import { UserCache } from "../../core/cache/user_chache";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { XpHelper } from "../../core/helper_classes/xp_helper";
import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { IFamilyMember } from "../../models/family/family_member_model";
import { IFamilyJoinRequestRepository } from "../../repository/family/family_join_request_repository";
import { isValidMongooseToken } from "../../core/Utils/helper_functions";

import {
  FAMILY_CREATE_PRICE,
  FAMILY_UPDATE_PRICE,
} from "../../core/Utils/constants";

export interface IFamilyService {
  createFamily(data: IFamily): Promise<IFamilyDocument>;
  updateFamilyInformation(
    myId: string,
    data: Partial<IFamily>,
  ): Promise<IFamilyDocument>;
  joinFamily(userId: string, familyId: string): Promise<IFamilyDocument | any>;
  getFamilyJoinStatus(userId: string): Promise<IFamilyDocument | null>;
}

export class FamilyService implements IFamilyService {
  familyRepository: IFamilyRepository =
    RepositoryProviders.familyRepositoryProvider;
  familyMemberRepository: IFamilyMemberRepository =
    RepositoryProviders.familyMemberRepositoryProvider;
  userRepository: IUserRepository = RepositoryProviders.userRepositoryProvider;
  userStatsRepository: IUserStatsRepository =
    RepositoryProviders.userStatsRepositoryProvider;
  familyJoinRequestRepository: IFamilyJoinRequestRepository =
    RepositoryProviders.familyJoinRequestRepositoryProvider;

  async createFamily(data: IFamily): Promise<IFamilyDocument> {
    //step1: validate leaderId
    const leader = await UserCache.getInstance().getUserBrief(
      data.leaderId.toString(),
    );
    if (!leader) throw new AppError(StatusCodes.NOT_FOUND, "Leader not found");
    //step2: check if user already has a family
    const family = await this.familyRepository.getByLeaderId(
      data.leaderId.toString(),
    );
    if (family || leader.familyId)
      throw new AppError(StatusCodes.BAD_REQUEST, "Family already exists");
    //step3: check if the user has required level -> 5
    if (leader.level < 5)
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "Leader does not have required level",
      );
    //step4: get the highest svip level of the user
    const highestSvip = await XpHelper.getInstance().getHighestSvipLevel(
      data.leaderId.toString(),
    );
    //step5: if no svip or svip is less than 4 then deduct the balance from the user
    if (highestSvip < 4) {
      await this.userStatsRepository.balanceDeduction(
        data.leaderId.toString(),
        FAMILY_CREATE_PRICE,
      );
    }
    //step6: create family
    const newFamily = await this.familyRepository.create(data);
    //step7: make the leader to be the first member
    const familyMember: IFamilyMember = {
      familyId: newFamily._id as string,
      userId: data.leaderId,
      role: FamilyMemberRole.Leader,
    };
    await Promise.all([
      this.familyMemberRepository.create(familyMember),
      this.userRepository.findUserByIdAndUpdate(data.leaderId.toString(), {
        familyId: newFamily._id as string,
      }),
    ]);
    //step8: return the created family
    return newFamily;
  }

  async updateFamilyInformation(
    myId: string,
    data: Partial<IFamily>,
  ): Promise<IFamilyDocument> {
    //step 1: fetch the family by leaderId
    const family = await this.familyRepository.getByLeaderId(myId);
    //step 2: check if family exists and if user is really the leader
    if (!family)
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "Family not found or you are not the leader",
      );

    //step 3: collect updated data - add non-empty allowed fields only
    const updatedData: Partial<IFamily> = {};
    if (data.name) updatedData.name = data.name;
    if (data.introduction) updatedData.introduction = data.introduction;
    if (data.coverPhoto) updatedData.coverPhoto = data.coverPhoto;
    if (data.joinMode) updatedData.joinMode = data.joinMode;
    if (data.minLevel !== undefined) updatedData.minLevel = data.minLevel;
    if (data.memberLimit !== undefined)
      updatedData.memberLimit = data.memberLimit;

    if (Object.keys(updatedData).length === 0) {
      throw new AppError(StatusCodes.BAD_REQUEST, "No valid field to update");
    }

    //step 4: check last update time (once a week allowed for free)
    const now = new Date();
    const lastUpdate = family.lastUpdatedAt
      ? new Date(family.lastUpdatedAt)
      : new Date(0);
    const msInWeek = 7 * 24 * 60 * 60 * 1000;

    if (now.getTime() - lastUpdate.getTime() < msInWeek) {
      // Less than a week since last update, must pay
      await this.userStatsRepository.balanceDeduction(
        myId,
        FAMILY_UPDATE_PRICE,
      );
    }

    //step 5: perform update
    updatedData.lastUpdatedAt = now;
    const updatedFamily = await this.familyRepository.update(
      family._id as string,
      updatedData,
    );

    if (!updatedFamily) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update family",
      );
    }

    return updatedFamily;
  }

  async joinFamily(
    userId: string,
    familyId: string,
  ): Promise<IFamilyDocument | any> {
    //step1: validate userId and familyId
    if (!isValidMongooseToken(userId) || !isValidMongooseToken(familyId)) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Invalid userId or familyId");
    }

    const [user, family, member] = await Promise.all([
      this.userRepository.findUserById(userId),
      this.familyRepository.getById(familyId),
      this.familyMemberRepository.getByUserId(userId),
    ]);

    if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    if (!family) throw new AppError(StatusCodes.NOT_FOUND, "Family not found");

    //step2: check minimum join level
    if (family.minLevel && user.level! < family.minLevel) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `At least level ${family.minLevel} is required to join this family`,
      );
    }

    //step3: check if user already member of another family
    if (user.familyId || member) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User is already a member of a family",
      );
    }

    //check if user is already the leader of a family (edge case if cache/user doc out of sync)
    const familyAsLeader = await this.familyRepository.getByLeaderId(userId);
    if (familyAsLeader) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User is already a leader of a family",
      );
    }

    //check member limit
    if (
      family.memberCount &&
      family.memberLimit &&
      family.memberCount >= family.memberLimit
    ) {
      throw new AppError(StatusCodes.BAD_REQUEST, "Family is full");
    }

    //step4: check for family join type
    if (family.joinMode === FamilyJoinMode.Free) {
      //simply create a family Member document and he joined
      const familyMember: IFamilyMember = {
        familyId: familyId,
        userId: userId,
        role: FamilyMemberRole.Member,
      };

      await Promise.all([
        this.familyMemberRepository.create(familyMember),
        this.userRepository.findUserByIdAndUpdate(userId, { familyId }),
        //increment member count
        this.familyRepository.update(familyId, {
          $inc: { memberCount: 1 },
        } as any),
      ]);

      return { family, status: "joined" };
    } else if (family.joinMode === FamilyJoinMode.Approval) {
      //check if request already exists
      const existingRequest = await this.familyJoinRequestRepository.findByUser(
        userId,
        familyId,
        StatusTypes.pending,
      );
      if (existingRequest) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "Join request already pending",
        );
      }

      //create the approval request
      await this.familyJoinRequestRepository.create({
        familyId,
        userId,
      });

      return { family, status: "pending" };
    }

    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid join mode");
  }

  async getFamilyJoinStatus(userId: string): Promise<IFamilyDocument | null> {
    const user = await this.userRepository.findUserById(userId);
    if (!user || !user.familyId) return null;

    return await this.familyRepository.getById(user.familyId.toString());
  }
}
