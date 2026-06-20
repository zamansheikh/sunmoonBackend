import { IUserRepository } from "../../repository/users/user_repository";
import IUserStatsRepository from "../../repository/users/userstats_repository_interface";
import { IDisconnectPayload } from "../entities/disconnect_payload_interface";

export interface IDisconnectWebhookResponse {
  received: true;
}

export interface IDisconnectWebhookService {
  handleDisconnect(payload: IDisconnectPayload): Promise<IDisconnectWebhookResponse>;
}

export default class DisconnectWebhookService implements IDisconnectWebhookService {
  private userRepo: IUserRepository;
  private statsRepo: IUserStatsRepository;

  constructor(userRepo: IUserRepository, statsRepo: IUserStatsRepository) {
    this.userRepo = userRepo;
    this.statsRepo = statsRepo;
  }

  async handleDisconnect(payload: IDisconnectPayload): Promise<IDisconnectWebhookResponse> {
    try {
      const user = await this.userRepo.findUserByShortId(payload.userId);
      await this.statsRepo.updateProperty(user._id as string, {
        coins: payload.finalBalance,
      });
    } catch {
      // Always respond 200 to prevent webhook retries
    }

    return { received: true };
  }
}
