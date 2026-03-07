import { AudioRoomCache } from "../../cache/audio_room_cache";
import { RepositoryProviders } from "../../providers/repository_providers";
import SocketServer from "../../sockets/socket_server";
import { ROOM_LEVEL_CRITERIA } from "../../Utils/constants";
import { SocketAudioChannels } from "../../Utils/enums";
import { socketResponse } from "../../Utils/helper_functions";

export const roomSupportRewardSystem = async () => {
  console.log("room support reward system " + new Date().toLocaleString());
  // prepare the repositories
  const roomSupportHistoryRepo =
    RepositoryProviders.roomSupportHistoryRepositoryProvider;
  const roomSupportRepo = RepositoryProviders.roomSupportRepositoryProvider;
  const userStatsRepo = RepositoryProviders.userStatsRepositoryProvider;
  // fetch all the support documents where level greater than 0
  const roomSupport = await roomSupportRepo.getAll();
  // for parallel proccess
  const promises: any = [];
  try {
    for (const room of roomSupport) {
      // distribute coin to the room owner
      const hostId = (
        await AudioRoomCache.getInstance().getBasicRoomInfo(room.roomId)
      )?.hostId;
      if (!hostId) continue;
      const criteria = ROOM_LEVEL_CRITERIA[room.roomLevel! - 1];
      promises.push(userStatsRepo.updateCoins(hostId, criteria.ownerCoin));
      // check for partner existance and distribute
      for (const partner of room.roomPartners!) {
        promises.push(
          userStatsRepo.updateCoins(partner.toString(), criteria.partnerCoin),
        );
      }
      // create history
      promises.push(
        roomSupportHistoryRepo.create({
          roomId: room.roomId,
          numberOfUniqueUsers: room.uniqueUsers.length,
          roomLevel: room.roomLevel || 0,
          roomTransaction: room.roomTransaction,
        }),
      );
    }
  } catch (error) {
    console.log(error);
  }
};
