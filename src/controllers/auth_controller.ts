import { IAuthService } from "../services/auth_service_interface";

 class AuthController {
    AuthService: IAuthService;
    constructor(AuthService: IAuthService) {
        this.AuthService = AuthService;
    }
}

export default AuthController