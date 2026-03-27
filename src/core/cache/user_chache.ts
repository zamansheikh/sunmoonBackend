import User from "../../models/user/user_model";
import UserRepository from "../../repository/users/user_repository";

export class UserCache {
  private static instance: UserCache | null = null;

  private cachedUserBriefs = new Map<
    string,
    { _id: string; name: string; avatar: string; expiry: number; familyId?: string }
  >();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hour = 1 day
  public userRepository = new UserRepository(User);

  private constructor() {}

  public static getInstance(): UserCache {
    if (UserCache.instance === null) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  public async getUserBrief(
    userId: string,
  ): Promise<{ _id: string; name: string; avatar: string; familyId?: string } | null> {
    const cached = this.cachedUserBriefs.get(userId);
    if (cached && cached.expiry > Date.now())
      return { _id: cached._id, name: cached.name, avatar: cached.avatar, familyId: cached.familyId };
    const user = await this.userRepository.findUserById(userId);
    if (!user) return null;
    const brief = {
      _id: (user as any)._id.toString(),
      name: user.name || user.username || "Unknown",
      avatar: user.avatar || "",
      familyId: user.familyId,
    };
    this.cachedUserBriefs.set(userId, {
      ...brief,
      expiry: Date.now() + this.CACHE_TTL,
    });
    return brief;
  }

  public async getUsersBriefs(
    userIds: string[],
  ): Promise<{ _id: string; name: string; avatar: string; familyId?: string }[]> {
    const uncachedIds: string[] = [];
    const results: { _id: string; name: string; avatar: string; familyId?: string }[] = [];

    userIds.forEach((id) => {
      const cached = this.cachedUserBriefs.get(id);
      if (cached && cached.expiry > Date.now()) {
        results.push({
          _id: cached._id,
          name: cached.name,
          avatar: cached.avatar,
          familyId: cached.familyId,
        });
      } else {
        uncachedIds.push(id);
      }
    });

    if (uncachedIds.length > 0) {
      const users = await this.userRepository.findUsersByIds(uncachedIds);
      users.forEach((user) => {
        const brief = {
          _id: (user as any)._id.toString(),
          name: user.name || user.username || "Unknown",
          avatar: user.avatar || "",
          familyId: user.familyId,
        };
        this.cachedUserBriefs.set((user as any)._id.toString(), {
          ...brief,
          expiry: Date.now() + this.CACHE_TTL,
        });
        results.push(brief);
      });
    }

    return results;
  }

  public async validateUserId(userId: string): Promise<boolean> {
    const cached = this.cachedUserBriefs.get(userId);
    if (cached && cached.expiry > Date.now()) return true;
    const user = await this.userRepository.findUserById(userId);
    if (user) {
      const brief = {
        _id: (user as any)._id.toString(),
        name: user.name || user.username || "Unknown",
        avatar: user.avatar || "",
      };
      this.cachedUserBriefs.set(userId, {
        ...brief,
        expiry: Date.now() + this.CACHE_TTL,
      });
      return true;
    }
    return false;
  }

  public async validateUserIds(userIds: string[]): Promise<boolean> {
    const allCached = userIds.every((id) => {
      const cached = this.cachedUserBriefs.get(id);
      return cached && cached.expiry > Date.now();
    });
    if (allCached) return true;
    const isValid = await this.userRepository.validateUserIds(userIds);
    if (isValid) {
      return true;
    }
    return false;
  }
}
