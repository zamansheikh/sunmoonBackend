import { ClientSession } from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../../core/errors/app_errors";
import { IAdmin, IAdminDocument, IAdminModel } from "../../entities/admin/admin_interface";

export interface IAdminRepository {
    createAdmin(admin: IAdmin): Promise<IAdminDocument>;
    getAdminById(id: string): Promise<IAdminDocument | null>;
    getAdminByUsername(username: string): Promise<IAdminDocument | null>;
    getAdminByEmail(email: string): Promise<IAdminDocument | null>;
    updateAdmin(id: string, admin: Partial<IAdmin>): Promise<IAdminDocument | null>;
    deleteAdmin(id: string): Promise<IAdminDocument | null>;
    getAdmin(): Promise<IAdminDocument | null>;
    updateCoin(id: string, coins: number, session?: ClientSession): Promise<IAdminDocument>;
}


export default class AdminRepository implements IAdminRepository {
    Model: IAdminModel;

    constructor(model: IAdminModel) {
        this.Model = model;
    }

    async createAdmin(admin: IAdmin): Promise<IAdminDocument> {
        const newAdmin = new this.Model(admin);
        return await newAdmin.save();
    }

    async getAdminById(id: string): Promise<IAdminDocument | null> {
        return this.Model.findById(id).select("-password");
    }

    async getAdminByUsername(username: string): Promise<IAdminDocument | null> {
        return this.Model.findOne({ username });
    }

    async getAdminByEmail(email: string): Promise<IAdminDocument | null> {
        return this.Model.findOne({ email }).select("-password");
    }

    async updateAdmin(id: string, admin: Partial<IAdmin>): Promise<IAdminDocument | null> {
        return this.Model.findByIdAndUpdate(id, admin, { new: true }).select("-password");
    }

    async deleteAdmin(id: string): Promise<IAdminDocument | null> {
        return this.Model.findByIdAndDelete(id).select("-password");
    }

    async getAdmin(): Promise<IAdminDocument | null> {
        return this.Model.findOne().select("-password");
    }

    async updateCoin(id: string, coins: number, session?: ClientSession): Promise<IAdminDocument> {
        const filter: Record<string, any> = { _id: id };
        // Guard against negative balances when deducting coins
        if (coins < 0) {
            filter.coins = { $gte: Math.abs(coins) };
        }
        const updated = await this.Model.findOneAndUpdate(filter, { $inc: { coins: coins } }, { new: true }).session(session || null);
        if (!updated)
            throw new AppError(StatusCodes.BAD_REQUEST, "Insufficient coins");
        return updated;
    }

}