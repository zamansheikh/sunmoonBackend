import RedisConfig from "../config/redis_config";

export class RedisService {
  private static instance: RedisService | null = null;
  private client = RedisConfig.getInstance();

  private constructor() {}

  public static getInstance(): RedisService {
    if (RedisService.instance === null) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  /**
   * Set a value in Redis
   * @param key Key
   * @param value Value (will be stringified if it's an object/array)
   * @param ttlSeconds Optional Time To Live in seconds
   */
  public async set(
    key: string,
    value: any,
    ttlSeconds?: number,
  ): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.set(key, stringValue, {
        EX: ttlSeconds,
      });
    } else {
      await this.client.set(key, stringValue);
    }
  }

  /**
   * Get a value from Redis
   * @param key Key
   */
  public async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;

    try {
      // Try to parse as JSON, if it fails, return the raw string
      return JSON.parse(data) as T;
    } catch (e) {
      return data as unknown as T;
    }
  }

  /**
   * Delete a key from Redis
   * @param key Key
   */
  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if a key exists in Redis
   * @param key Key
   */
  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set expiry for a key
   * @param key Key
   * @param seconds Seconds
   */
  public async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  /**
   * Get the underlying Redis client if needed for advanced operations
   */
  public getClient() {
    return this.client;
  }
}

export default RedisService;
