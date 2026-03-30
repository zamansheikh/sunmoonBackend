import { IFamilyMember, IFamilyMemberDocument, IFamilyMemberModel } from "../../models/family/family_member_model";

export interface IFamilyMemberRepository {
    create(data:IFamilyMember, session?: any):Promise<IFamilyMemberDocument>;
    getByUserId(userId: string): Promise<IFamilyMemberDocument | null>;
    update(userId: string, data: Partial<IFamilyMember>): Promise<IFamilyMemberDocument | null>;
}

export class FamilyMemberRepository implements IFamilyMemberRepository {
    model: IFamilyMemberModel;

    constructor(model:IFamilyMemberModel){
        this.model = model;
    }
    async create(data:IFamilyMember, session?: any):Promise<IFamilyMemberDocument>{
        const familyMember = new this.model(data);
        return await familyMember.save({ session });
    }
    async getByUserId(userId: string): Promise<IFamilyMemberDocument | null> {
        return await this.model.findOne({ userId });
    }

    async update(userId: string, data: Partial<IFamilyMember>): Promise<IFamilyMemberDocument | null> {
        return await this.model.findOneAndUpdate({ userId }, data, { new: true });
    }
}