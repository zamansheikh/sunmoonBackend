import { RepositoryProviders } from "../../core/providers/repository_providers";
import { ICoinBagDistributionRepository } from "../../repository/audio_room/coin_bag_distribution_repository";
import { ICoinBagDistribution } from "../../models/audio_room/coin_bag_distribution_model";

export default class CoinBagDistributionService {
  private static instance: CoinBagDistributionService;
  private distributionRepository: ICoinBagDistributionRepository;

  private constructor() {
    this.distributionRepository =
      RepositoryProviders.coinBagDistributionRepositoryProvider;
  }

  public static getInstance(): CoinBagDistributionService {
    if (!CoinBagDistributionService.instance) {
      CoinBagDistributionService.instance = new CoinBagDistributionService();
    }
    return CoinBagDistributionService.instance;
  }

  public async create(data: ICoinBagDistribution): Promise<ICoinBagDistribution> {
    return await this.distributionRepository.create(data);
  }

  public async getAll(): Promise<ICoinBagDistribution[]> {
    return await this.distributionRepository.getAll();
  }

  public async getByType(type: number): Promise<ICoinBagDistribution> {
    return await this.distributionRepository.getByType(type);
  }

  public async getById(id: string): Promise<ICoinBagDistribution> {
    return await this.distributionRepository.getById(id);
  }

  public async update(data: ICoinBagDistribution): Promise<ICoinBagDistribution | null> {
    return await this.distributionRepository.update(data);
  }
}
