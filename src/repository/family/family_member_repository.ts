import { IFamilyMember, IFamilyMemberDocument, IFamilyMemberModel } from "../../models/family/family_member_model";

export interface IFamilyMemberRepository {
    create(data:IFamilyMember):Promise<IFamilyMemberDocument>;
}

export class FamilyMemberRepository implements IFamilyMemberRepository {
    model: IFamilyMemberModel;

    constructor(model:IFamilyMemberModel){
        this.model = model;
    }
    async create(data:IFamilyMember):Promise<IFamilyMemberDocument>{
        const familyMember = new this.model(data);
        return await familyMember.save();
    }
}