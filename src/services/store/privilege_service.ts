import { PrivilegeTypes } from "../../core/Utils/enums";
import { RepositoryProviders } from "../../core/providers/repository_providers";

export default class PrivilegeService {
  private static instance: PrivilegeService;

  private readonly availablePrivileges = [
    {
      name: PrivilegeTypes.AntiBanChat,
      description: "No one can ban from sending messages in the room",
      tag: "anti_ban_chat",
    },
    {
      name: PrivilegeTypes.AntiKick,
      description: "No one can kick you from the room",
      tag: "anti_kick",
    },
    {
      name: PrivilegeTypes.AntiMute,
      description: "No one can mute you in the room",
      tag: "anti_mute",
    },
  ];

  private constructor() {}

  public static getInstance(): PrivilegeService {
    if (!PrivilegeService.instance) {
      PrivilegeService.instance = new PrivilegeService();
    }
    return PrivilegeService.instance;
  }

  public async getPrivilages() {
    return this.availablePrivileges;
  }

  /**
   * Checks if a user has a specific privilege based on their equipped store items.
   * Uses an optimized repository call to minimize database and network overhead.
   *
   * @param userId - The ID of the user to check
   * @param privilege - The privilege type to look for
   * @returns Promise<boolean> - True if the user has the privilege
   */
  public async hasPrivilege(
    userId: string,
    privilege: PrivilegeTypes,
  ): Promise<boolean> {
    const activePrivileges =
      await RepositoryProviders.myBucketRepositoryProvider.getEquippedPrivileges(
        userId,
      );
    return activePrivileges.includes(privilege);
  }

  /**
   * Specifically checks if a user can be muted.
   * Returns false if the user has the AntiMute privilege.
   *
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user can be muted, false if they are protected
   */
  public async canUserBeMuted(userId: string): Promise<boolean> {
    const hasAntiMute = await this.hasPrivilege(
      userId,
      PrivilegeTypes.AntiMute,
    );
    return !hasAntiMute;
  }

  /**
   * Checks if a user can be kicked from a room.
   * Returns false if the user has the AntiKick privilege.
   *
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user can be kicked, false if they are protected
   */
  public async canUserBeKicked(userId: string): Promise<boolean> {
    const hasAntiKick = await this.hasPrivilege(
      userId,
      PrivilegeTypes.AntiKick,
    );
    return !hasAntiKick;
  }

  /**
   * Checks if a user can be banned from a room.
   * Returns false if the user has the AntiBanChat privilege.
   *
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user can be banned, false if they are protected
   */
  public async canUserBeBannedFromChat(userId: string): Promise<boolean> {
    const hasAntiBan = await this.hasPrivilege(
      userId,
      PrivilegeTypes.AntiBanChat,
    );
    return !hasAntiBan;
  }
}
