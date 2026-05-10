import { IReferralConfig, IReferralConfigDocument, IReferralConfigModel } from "../../models/referral/referralConfigModel";

export interface IReferralConfigRepository {
    getConfig(): Promise<IReferralConfigDocument | null>;
    createOrUpdateConfig(config: IReferralConfig): Promise<IReferralConfigDocument>;
    updateConfig(id: string, config: Partial<IReferralConfig>): Promise<IReferralConfigDocument | null>;
    deleteConfig(id: string): Promise<IReferralConfigDocument | null>;
}

export class ReferralConfigRepository implements IReferralConfigRepository {
    private model: IReferralConfigModel;
    constructor(model: IReferralConfigModel) {
        this.model = model;
    }

    async getConfig(): Promise<IReferralConfigDocument | null> {
        return this.model.findOne();
    }

    async createOrUpdateConfig(config: IReferralConfig): Promise<IReferralConfigDocument> {
        const existingConfig = await this.model.findOne();
        if (existingConfig) {
            Object.assign(existingConfig, config);
            return existingConfig.save();
        }
        return this.model.create(config);
    }

    async updateConfig(id: string, config: Partial<IReferralConfig>): Promise<IReferralConfigDocument | null> {
        return this.model.findByIdAndUpdate(id, config, { new: true });
    }

    async deleteConfig(id: string): Promise<IReferralConfigDocument | null> {
        return this.model.findByIdAndDelete(id);
    }
}
