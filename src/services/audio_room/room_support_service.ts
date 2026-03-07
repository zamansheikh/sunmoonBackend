import { IRoomSupportDocument } from "../../models/audio_room/room_support_model";
import { IRoomSupportRepository } from "../../repository/audio_room/room_support_repository";
import AppError from "../../core/errors/app_errors";
import { ROOM_LEVEL_CRITERIA } from "../../core/Utils/constants";
import { AudioRoomCache } from "../../core/cache/audio_room_cache";
import { UserCache } from "../../core/cache/user_chache";

export interface IRoomSupportService {
  getMyRoomSupportDetails(roomId: string): Promise<IRoomSupportDocument>;
  addRoomPartners(
    roomId: string,
    partnerId: string,
  ): Promise<IRoomSupportDocument>;
  removeRoomPartners(
    roomId: string,
    partnerId: string,
  ): Promise<IRoomSupportDocument>;
}

export class RoomSupportService implements IRoomSupportService {
  RoomSupportRepository: IRoomSupportRepository;
  constructor(RoomSupportRepository: IRoomSupportRepository) {
    this.RoomSupportRepository = RoomSupportRepository;
  }

  async getMyRoomSupportDetails(roomId: string): Promise<IRoomSupportDocument> {
    return await this.RoomSupportRepository.getByRoomId(roomId);
  }

  /**
   * Adds a partner to an audio room's support system.
   *
   * INTENT:
   * This function manages the assignment of "Room Partners" based on the room's support level.
   * It ensures that:
   * 1. Both the Room and the User (Partner) exist and are valid via cache/DB checks.
   * 2. Partners can only be added if the room has reached at least Level 1 support.
   * 3. The total number of partners does not exceed the allowed limit defined for the current room level
   *    in the ROOM_LEVEL_CRITERIA configuration.
   *
   * @param roomId - The unique identifier of the audio room.
   * @param partnerId - The unique identifier of the user to be added as a partner.
   * @returns The updated room support document.
   * @throws AppError if IDs are invalid, room level is insufficient, or partner slots are full.
   */
  async addRoomPartners(
    roomId: string,
    partnerId: string,
  ): Promise<IRoomSupportDocument> {
    // Step 1: Validate the existence of the Room and the Partner using cached lookup for performance
    const isValidRoomId =
      await AudioRoomCache.getInstance().validateRoomId(roomId);
    const isValidPartnerId =
      await UserCache.getInstance().validateUserId(partnerId);

    // Step 2: Ensure the Room ID is valid and exists in the system
    if (!isValidRoomId) {
      throw new AppError(400, "roomId is not valid");
    }

    // Step 3: Ensure the Partner (User) ID is valid and exists in the system
    if (!isValidPartnerId) {
      throw new AppError(400, "partnerId is not valid");
    }

    // Step 4: Retrieve the current support document for the room
    const support = await this.RoomSupportRepository.getByRoomId(roomId);
    const level = support.roomLevel || 0;

    // Step 5: Check if the room has eligibility for partners (must be level > 0)
    if (level === 0) {
      throw new AppError(400, "room partner is not available");
    }

    // Step 6: Fetch the criteria for the current room level to find the partner slot limit
    const criteria = ROOM_LEVEL_CRITERIA[level - 1];
    if (!criteria) {
      throw new AppError(400, "Invalid room level criteria");
    }

    // Step 7: Check if the room currently has available slots for new partners
    const currentPartners = support.roomPartners || [];
    if (currentPartners.length >= criteria.numberOfPartners) {
      throw new AppError(400, "already enough rooom partner");
    }

    // Step 8: check if the partner is already added or not
    const isPartnerAlreadyAdded = currentPartners.some(
      (id) => id.toString() === partnerId.toString(),
    );
    if (isPartnerAlreadyAdded) {
      throw new AppError(400, "user is already a partner of this room");
    }

    // Step 9: Persist the new partner relationship in the repository
    return await this.RoomSupportRepository.addPartner(roomId, partnerId);
  }

  /**
   * Removes a partner from an audio room's support system.
   *
   * INTENT:
   * Provides a way to revoke "Room Partner" status. It verifies that the partner
   * is actually assigned to the room before attempting removal to prevent
   * illogical state changes.
   *
   * @param roomId - The unique identifier of the audio room.
   * @param partnerId - The unique identifier of the user to be removed.
   * @returns The updated room support document.
   * @throws AppError if the user is not currently a partner of the room.
   */
  async removeRoomPartners(
    roomId: string,
    partnerId: string,
  ): Promise<IRoomSupportDocument> {
    // Step 1: Validate the existence of the Room using cached lookup for performance
    const isValidRoomId =
      await AudioRoomCache.getInstance().validateRoomId(roomId);

    if (!isValidRoomId) {
      throw new AppError(400, "roomId is not valid");
    }

    // Step 2: Fetch the current support document
    const support = await this.RoomSupportRepository.getByRoomId(roomId);

    // Step 3: Extract current partners or default to empty list
    const currentPartners = support.roomPartners || [];

    // Step 4: Verify that the user is actually a partner in this room
    const isPartner = currentPartners.some(
      (id) => id.toString() === partnerId.toString(),
    );

    if (!isPartner) {
      throw new AppError(400, "user is not a partner of this room");
    }

    // Step 5: Proceed with removal in the repository
    return await this.RoomSupportRepository.removePartner(roomId, partnerId);
  }
}
