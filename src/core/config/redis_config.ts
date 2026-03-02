import {
  createClient,
  RedisClientType,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from "redis";
import dotenv from "dotenv";

dotenv.config();

type RedisType = ReturnType<typeof createClient>;

class RedisConfig {
  private static instance: RedisType | null = null;
  private static isConnecting = false;

  private constructor() {
    // private to prevent direct instantiation
  }

  public static getInstance(): RedisType {
    if (RedisConfig.instance) {
      return RedisConfig.instance;
    }

    const url = process.env.REDIS_URL || "redis://localhost:6379";

    const client = createClient({
      url,
    });

    client.on("error", (err) => console.error("[Redis] Client Error:", err));
    client.on("connect", () => console.log("[Redis] Connected to server"));
    client.on("ready", () => console.log("[Redis] Ready to use"));
    client.on("reconnecting", () => console.log("[Redis] Reconnecting..."));
    client.on("end", () => console.log("[Redis] Connection closed"));

    RedisConfig.instance = client;
    return client;
  }

  public static async connect(): Promise<void> {
    const client = RedisConfig.getInstance();

    if (client.isOpen) return;
    if (RedisConfig.isConnecting) return; // Wait if already connecting

    RedisConfig.isConnecting = true;
    try {
      await client.connect();
    } catch (error) {
      console.error("[Redis] Failed to connect:", error);
      throw error;
    } finally {
      RedisConfig.isConnecting = false; // Reset the flag
    }
  }

  public static async disconnect(): Promise<void> {
    const client = RedisConfig.getInstance();
    if (client.isOpen) {
      await client.quit();
    }
  }
}

export default RedisConfig;
