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
   * Add a value to a Redis list (RPUSH)
   * @param key Key
   * @param value Value (will be stringified if it's an object/array)
   */
  public async addToArray(key: string, value: any): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);
    await this.client.rPush(key, stringValue);
  }

  /**
   * Remove a value from a Redis list (LREM)
   * @param key Key
   * @param value Value (will be stringified if it's an object/array)
   */
  public async removeFromArray(key: string, value: any): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);
    // LREM key 0 value removes all occurrences
    await this.client.lRem(key, 0, stringValue);
  }

  /**
   * Add a value to a Redis set (SADD)
   * Sets only allow unique values; duplicates are ignored.
   * @param key Key
   * @param value Value (will be stringified if it's an object/array)
   */
  public async addToSet(key: string, ...values: any[]): Promise<void> {
    if (values.length === 0) return;
    const stringValues = values.map((value) =>
      typeof value === "string" ? value : JSON.stringify(value),
    );
    await this.client.sAdd(key, stringValues);
  }

  /**
   * Remove a value from a Redis set (SREM)
   * @param key Key
   * @param value Value (will be stringified if it's an object/array)
   */
  public async removeFromSet(key: string, ...values: any[]): Promise<void> {
    if (values.length === 0) return;
    const stringValues = values.map((value) =>
      typeof value === "string" ? value : JSON.stringify(value),
    );
    await this.client.sRem(key, stringValues);
  }

  /**
   * Get all members of a Redis set (SMEMBERS)
   * @param key Key
   */
  public async getSetMembers<T>(key: string): Promise<T[]> {
    const members = await this.client.sMembers(key);
    return members.map((member) => {
      try {
        return JSON.parse(member);
      } catch {
        return member as unknown as T;
      }
    });
  }

  /**
   * Get the number of members in a Redis set (SCARD)
   * @param key Key
   */
  public async getSetCount(key: string): Promise<number> {
    return await this.client.sCard(key);
  }

  /**
   * Get the underlying Redis client if needed for advanced operations
   */
  public getClient() {
    return this.client;
  }
}

export default RedisService;
