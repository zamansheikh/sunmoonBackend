import { IFamily, IFamilyDocument } from "../../models/family/family_model";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IFamilyRepository } from "../../repository/family/family_repository";
import { IFamilyMemberRepository } from "../../repository/family/family_member_repository";
import { FamilyMemberRole } from "../../core/Utils/enums";
import { UserCache } from "../../core/cache/user_chache";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";
import { XpHelper } from "../../core/helper_classes/xp_helper";
import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { IFamilyMember } from "../../models/family/family_member_model";

export interface IFamilyService {
  createFamily(data: IFamily): Promise<IFamilyDocument>;
}

export class FamilyService implements IFamilyService {
  familyRepository: IFamilyRepository =
    RepositoryProviders.familyRepositoryProvider;
  familyMemberRepository: IFamilyMemberRepository =
    RepositoryProviders.familyMemberRepositoryProvider;
  userRepository: IUserRepository = RepositoryProviders.userRepositoryProvider;
  userStatsRepository: IUserStatsRepository =
    RepositoryProviders.userStatsRepositoryProvider;

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
      const CreateFamilyPrice = 10 * 1000 * 1000; // 10 million
      await this.userStatsRepository.balanceDeduction(
        data.leaderId.toString(),
        CreateFamilyPrice,
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
}
