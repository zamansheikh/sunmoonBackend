import { IUserEntity } from "../entities/user_entity_interface";
import { IUserDocument } from "../models/user_model_interface";

export interface IUserRepository {
    create(userEntity: IUserEntity): Promise<IUserDocument>;
    findByEmail(email: string): Promise<IUserDocument | null>;
    updateGoogleCredemtials({ email, access_token, id_token }: { email: string, access_token: string, id_token: string }): Promise<IUserDocument>;
}