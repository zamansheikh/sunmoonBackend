import { IReferralConfigRepository } from "../../repository/referral/referral_config_repository";
import {
  IReferralConfig,
  IReferralConfigDocument,
} from "../../models/referral/referralConfigModel";
import AppError from "../../core/errors/app_errors";
import { StatusCodes } from "http-status-codes";

export class ReferralService {
  private referralConfigRepository: IReferralConfigRepository;

  constructor(referralConfigRepository: IReferralConfigRepository) {
    this.referralConfigRepository = referralConfigRepository;
  }

  async createOrUpdateConfig(
    config: IReferralConfig,
  ): Promise<IReferralConfigDocument> {
    return await this.referralConfigRepository.createOrUpdateConfig(config);
  }

  async getConfig(): Promise<IReferralConfigDocument | null> {
    return await this.referralConfigRepository.getConfig();
  }

  async updateConfig(
    id: string,
    config: Partial<IReferralConfig>,
  ): Promise<IReferralConfigDocument | null> {
    return await this.referralConfigRepository.updateConfig(id, config);
  }

  async deleteConfig(id: string): Promise<IReferralConfigDocument | null> {
    return await this.referralConfigRepository.deleteConfig(id);
  }
}
