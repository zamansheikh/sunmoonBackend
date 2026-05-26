import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { UserRoles } from "../../core/Utils/enums";
import { IUserRepository } from "../../repository/users/user_repository";
import { IPagination } from "../../core/Utils/query_builder";
import { IUserDocument } from "../../models/user/user_model_interface";

export interface IAppResellerService {
  updateUserRole(userId: string, newRole: UserRoles): Promise<{ id: string; userRole: string }>;
  getAllResellers(query: Record<string, unknown>): Promise<{
    pagination: IPagination;
    users: IUserDocument[];
  }>;
}

export default class AppResellerService implements IAppResellerService {
  UserRepository: IUserRepository;

  constructor(UserRepository: IUserRepository) {
    this.UserRepository = UserRepository;
  }

  async getAllResellers(
    query: Record<string, unknown>,
  ): Promise<{ pagination: IPagination; users: IUserDocument[] }> {
    return this.UserRepository.getUserByRole(UserRoles.Reseller, query);
  }

  async updateUserRole(
    userId: string,
    newRole: UserRoles,
  ): Promise<{ id: string; userRole: string }> {
    // Only allow switching between "user" and "re-seller"
    const allowedRoles = [UserRoles.User, UserRoles.Reseller];
    if (!allowedRoles.includes(newRole)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Role can only be changed to "${UserRoles.User}" or "${UserRoles.Reseller}"`,
      );
    }

    const user = await this.UserRepository.findUserById(userId);
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    // Validate the user's current role is also allowed (must be user or reseller)
    if (!allowedRoles.includes(user.userRole as UserRoles)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Cannot change role for users with role "${user.userRole}"`,
      );
    }

    // No-op if the role is already the same
    if (user.userRole === newRole) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `User already has the role "${newRole}"`,
      );
    }

    const updatedUser = await this.UserRepository.findUserByIdAndUpdate(userId, {
      userRole: newRole,
    });

    if (!updatedUser) {
      throw new AppError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Failed to update user role",
      );
    }

    return {
      id: updatedUser._id as string,
      userRole: updatedUser.userRole as string,
    };
  }
}
