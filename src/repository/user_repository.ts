import { IUserEntity } from "../entities/user_entity_interface";
import { IUserModel } from "../models/user_model_interface";

class UserRepository {
    UserModel: IUserModel;
    constructor(UserModel: IUserModel) {
        this.UserModel = UserModel;
    }

    async create(UserEntity: IUserEntity) {
        const user = new this.UserModel(UserEntity);
        return await user.save();
    }

    async findByEmail(email: String) {
        return await this.UserModel.findOne({ email });
    }
    async updateGoogleCredemtials({ email, access_token, id_token }: { email: string, access_token?: string, id_token?: string }) {
        const user = await this.UserModel.findOne({ email });
        if (user) {
            if (access_token !== undefined) {
                user.authData.google.access_token = access_token;
            }
            if (id_token !== undefined) {
                user.authData.google.id_token = id_token;
            }
            return await user.save();
        }
        throw new Error("User not found");
    }
}

export default UserRepository;