import { IUserEntity } from "../entities/user_entity_interface";
import { IUserRepository } from "../repository/user_repository_interface";

class AuthService {
    UserRepository: IUserRepository;
    constructor(UserRepository: IUserRepository) {
        this.UserRepository = UserRepository;
    }

    async registerWithGoogle(UserData: IUserEntity) {
        const existingUser = await this.UserRepository.findByEmail(UserData.email);
        if (existingUser) this.UserRepository.updateGoogleCredemtials({
            email: UserData.email,
            access_token: UserData.authData.google.access_token ,
            id_token: UserData.authData.google.id_token
        });
        // TODO: Complete the code
    }
}

export default AuthService