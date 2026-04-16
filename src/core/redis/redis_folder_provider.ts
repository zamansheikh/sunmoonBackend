export class RedisFolderProvider {
  static readonly RocketServiceFolderPrefix = "rocket_service";
  static readonly MicInviteServiceFolderPrefix = "mic_invite_service";
  static readonly MgbInvitationTrackingServiceFolderPrefix =
    "mgb_invitation_tracking_service";
  static readonly MgbGiftTrackingSystemFolderPrefix =
    "mgb_gift_tracking_system";
  static readonly CoinBagServiceFolderPrefix = "coin_bag_service";

  static {
    // Automatically validate that no two prefixes share the same value
    const values = Object.values(this).filter((v) => typeof v === "string");
    const uniqueValues = new Set(values);

    if (values.length !== uniqueValues.size) {
      const duplicates = values.filter(
        (val, index) => values.indexOf(val) !== index,
      );
      throw new Error(
        `[CRITICAL] RedisFolderProvider: Duplicate folder prefixes detected: "${duplicates.join(
          ", ",
        )}". Every Redis folder must have a unique name to prevent data collisions.`,
      );
    }
  }
}
