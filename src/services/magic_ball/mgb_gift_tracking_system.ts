import { RepositoryProviders } from "../../core/providers/repository_providers";

export class MgbGiftTrackingSystem {
  private static instance: MgbGiftTrackingSystem | null = null;

  // repository
  private readonly UserStatsRepository =
    RepositoryProviders.userStatsRepositoryProvider;

  private constructor() {}

  public static getInstance(): MgbGiftTrackingSystem {
    if (MgbGiftTrackingSystem.instance === null) {
      MgbGiftTrackingSystem.instance = new MgbGiftTrackingSystem();
    }
    return MgbGiftTrackingSystem.instance;
  }

  public async onGiftSent(senderId: string, giftId: string) {}
}
