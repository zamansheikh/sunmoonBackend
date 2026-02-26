import User from "../../models/user/user_model";
import UserRepository from "../../repository/users/user_repository";

export class UserCache {
  private static instance: UserCache | null = null;

  public cachedUser = new Map<string, number>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hour = 1 day
  public userRepository = new UserRepository(User);

  private constructor() {}

  public static getInstance(): UserCache {
    if (UserCache.instance === null) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  public async validateUserId(userId: string): Promise<boolean> {
    const expiry = this.cachedUser.get(userId);
    if (expiry && expiry > Date.now()) return true;
    const user = await this.userRepository.findUserById(userId);
    if (user) {
      this.cachedUser.set(userId, Date.now() + this.CACHE_TTL);
      return true;
    }
    return false;
  }

  public async validateUserIds(userIds: string[]): Promise<boolean> {
    const allCached = userIds.every((id) => {
      const expiry = this.cachedUser.get(id);
      return expiry && expiry > Date.now();
    });
    if (allCached) return true;
    const isValid = await this.userRepository.validateUserIds(userIds);
    if (isValid) {
      userIds.forEach((id) =>
        this.cachedUser.set(id, Date.now() + this.CACHE_TTL),
      );
      return true;
    }
    return false;
  }
}
