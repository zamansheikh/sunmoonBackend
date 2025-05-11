import { IUserEntity } from "../entities/user_entity_interface";

export interface IAuthService {
    registerWithGoogle(UserData: IUserEntity):void;
}