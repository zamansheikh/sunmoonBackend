import { IFamily, IFamilyDocument } from "../../models/family/family_model";
import { RepositoryProviders } from "../../core/providers/repository_providers";
import { IFamilyRepository } from "../../repository/family/family_repository";
import { IFamilyMemberRepository } from "../../repository/family/family_member_repository";
import { FamilyMemberRole } from "../../core/Utils/enums";

export interface IFamilyService {
  createFamily(data: IFamily): Promise<IFamilyDocument>;
}


export class FamilyService implements IFamilyService {
    familyRepository: IFamilyRepository = RepositoryProviders.familyRepositoryProvider;
    familyMemberRepository: IFamilyMemberRepository = RepositoryProviders.familyMemberRepositoryProvider;

    async createFamily(data: IFamily): Promise<IFamilyDocument> {
       //step1: check if user already has a family
       //step2: check if the user has required level -> 5
       //step3: check if the user has SVIP-4 or above purchased
       //step4: if no svip then check for balance 
       //step5: deduct the balance from the user if no svip
       //step6: create family
       //step7: make the leader to be the first member
       //step8: return the created family
    }  
    
}
