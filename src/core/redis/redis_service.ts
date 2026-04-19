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
   * @returns Number of elements added to the set
   */
  public async addToSet(key: string, ...values: any[]): Promise<number> {
    if (values.length === 0) return 0;
    const stringValues = values.map((value) =>
      typeof value === "string" ? value : JSON.stringify(value),
    );
    return await this.client.sAdd(key, stringValues);
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
   * Increment a key's value (INCRBY)
   * @param key Key
   * @param amount Amount to increment (default 1)
   */
  public async increment(key: string, amount: number = 1): Promise<number> {
    return await this.client.incrBy(key, amount);
  }

  /**
   * Add a value to a Redis sorted set (ZADD)
   * @param key Key
   * @param value Value (will be stringified if it's an object/array)
   * @param score Score for sorting
   */
  public async addToSortedSet(
    key: string,
    value: any,
    score: number,
  ): Promise<void> {
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);
    await this.client.zAdd(key, {
      score: score,
      value: stringValue,
    });
  }

  /**
   * Get members of a sorted set in a specific range (ZRANGE)
   * @param key Key
   * @param start Start index (default 0)
   * @param stop Stop index (default -1)
   * @param reverse If true, use REV option
   */
  public async getSortedSetRange<T>(
    key: string,
    start: number = 0,
    stop: number = -1,
    reverse: boolean = false,
  ): Promise<T[]> {
    let members: string[];
    if (reverse) {
      members = await this.client.zRange(key, start, stop, {
        REV: true,
      });
    } else {
      members = await this.client.zRange(key, start, stop);
    }

    return members.map((member) => {
      try {
        return JSON.parse(member);
      } catch {
        return member as unknown as T;
      }
    });
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
   * Delete keys matching a pattern
   * @param pattern Pattern to match (e.g., prefix:*)
   */
  public async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  /**
   * Get the remaining TTL of a key in seconds
   * @param key Key
   * @returns TTL in seconds, or -1 if no TTL, or -2 if key does not exist
   */
  public async getTTL(key: string): Promise<number> {
    return await this.client.ttl(key);
  }

  /**
   * Get the underlying Redis client if needed for advanced operations
   */
  public getClient() {
    return this.client;
  }
}

export default RedisService;
