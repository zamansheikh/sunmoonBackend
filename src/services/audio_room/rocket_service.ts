import RedisService from "../../core/redis/redis_service";
import SingletonSocketServer from "../../core/sockets/singleton_socket_server";
import { SocketAudioChannels } from "../../core/Utils/enums";

export class RocketService {
  private static instance: RocketService | null = null;
  private redis = RedisService.getInstance();

  private constructor() {}

  public static getInstance(): RocketService {
    if (!RocketService.instance) {
      RocketService.instance = new RocketService();
    }
    return RocketService.instance;
  }

  /**
   * Adds fuel to the rocket in a specific room
   * @param roomId ID of the audio room
   * @param amount Amount of fuel to add
   */
  public async addFuel(roomId: string, amount: number) {
    const fuelKey = `rocket:fuel:${roomId}`;
    const levelKey = `rocket:level:${roomId}`;

    // 1. Update fuel in Redis
    const currentFuel = await this.redis.getClient().incrBy(fuelKey, amount);

    // 2. Fetch current level
    let currentLevel = parseInt(
      (await this.redis.getClient().get(levelKey)) || "1",
    );

    console.log(
      `[Rocket] Room ${roomId}: +${amount} fuel (Total: ${currentFuel})`,
    );

    // 3. Process intermediate logic
    await this.checkLevelUp(roomId, currentFuel, currentLevel);

    // 4. Notify clients about new fuel percentage/amount
    // Assuming each level needs 1000 fuel for now (you can adjust this logic)
    const fuelPercentage = (currentFuel % 1000) / 10;

    const socketServer = SingletonSocketServer.getInstance();
    socketServer.emitToRoom(
      roomId,
      SocketAudioChannels.NewRocketFuelPercentage,
      {
        roomId,
        fuel: currentFuel,
        percentage: fuelPercentage,
      },
    );

    return { currentFuel, currentLevel };
  }

  /**
   * Internal function to handle level up logic
   */
  private async checkLevelUp(
    roomId: string,
    fuel: number,
    currentLevel: number,
  ) {
    const fuelNeededForNextLevel = currentLevel * 1000; // Example formula

    if (fuel >= fuelNeededForNextLevel) {
      const newLevel = currentLevel + 1;
      await this.redis
        .getClient()
        .set(`rocket:level:${roomId}`, newLevel.toString());

      console.log(`[Rocket] Room ${roomId} LEVELED UP to ${newLevel}!`);

      // Call other internal functions
      await this.handleMilestoneReward(roomId, newLevel);

      // Notify via Socket
      const socketServer = SingletonSocketServer.getInstance();
      socketServer.emitToRoom(roomId, SocketAudioChannels.NewRocketLevel, {
        roomId,
        level: newLevel,
      });

      // If it reaches a special level, launch it!
      if (newLevel % 5 === 0) {
        await this.launchRocket(roomId, newLevel);
      }
    }
  }

  private async handleMilestoneReward(roomId: string, level: number) {
    console.log(
      `[Rocket] Handling milestone reward for level ${level} in room ${roomId}`,
    );
    // Add your custom reward logic here (e.g. updating DB, giving badges, etc.)
  }

  private async launchRocket(roomId: string, level: number) {
    console.log(
      `[Rocket] LAUNCHING ROCKET in room ${roomId} at level ${level}!`,
    );

    const socketServer = SingletonSocketServer.getInstance();
    socketServer.emitToRoom(roomId, SocketAudioChannels.LaunchRocket, {
      roomId,
      level,
      message: "Rocket Launching!",
    });

    // Reset fuel/level if necessary after launch?
    // Or keep it escalating. Based on your game design.
  }
}

export default RocketService;
