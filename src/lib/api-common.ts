/**
 * 统一的 API 响应处理和错误处理
 */

import { getFriendlyErrorMessage } from "@/lib/ui-config";

// ===== API 响应类型 =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  detail?: string;
}

export interface TxResult {
  success: boolean;
  hash?: string;
  error?: string;
}

// ===== 标准化错误处理 =====
export function toFriendlyError(error: any): string {
  if (error instanceof Error) {
    const msg = error.message;
    // 提取合约错误信息
    const contractErrorMatch = msg.match(/reverted with reason string ['\"]([^'\"]+)['\"]/);
    if (contractErrorMatch) {
      return getFriendlyErrorMessage(contractErrorMatch[1]);
    }
    return getFriendlyErrorMessage(msg);
  }
  const str = String(error);
  return getFriendlyErrorMessage(str);
}

export function toFriendlyTxError(txError: string | undefined): string {
  if (!txError) return "交易失败，请重试";
  return toFriendlyError(txError);
}

// ===== 标准化 API 调用 =====
export async function callApi<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      cache: "no-store",
    });

    const body = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: body.detail || body.message || body.error || `HTTP ${response.status}`,
      };
    }

    return {
      success: true,
      data: body.data || body,
    };
  } catch (error) {
    return {
      success: false,
      error: toFriendlyError(error),
    };
  }
}

// ===== 数据刷新管理器 =====
export class RefreshManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private lastRefreshTime: Map<string, number> = new Map();
  private minInterval: number = 1000; // 最少间隔 1秒

  schedule(
    key: string,
    callback: () => Promise<void>,
    interval: number = 5000
  ) {
    this.clear(key);
    const timer = setInterval(async () => {
      const now = Date.now();
      const lastTime = this.lastRefreshTime.get(key) ?? 0;
      if (now - lastTime >= this.minInterval) {
        this.lastRefreshTime.set(key, now);
        await callback();
      }
    }, interval);
    this.timers.set(key, timer);
  }

  immediate(key: string, callback: () => Promise<void>) {
    const now = Date.now();
    const lastTime = this.lastRefreshTime.get(key) ?? 0;
    if (now - lastTime >= this.minInterval) {
      this.lastRefreshTime.set(key, now);
      return callback();
    }
  }

  clear(key: string) {
    const timer = this.timers.get(key);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(key);
    }
  }

  clearAll() {
    for (const [, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}

// ===== 单例实例 =====
let refreshManagerInstance: RefreshManager | null = null;

export function getRefreshManager(): RefreshManager {
  if (!refreshManagerInstance) {
    refreshManagerInstance = new RefreshManager();
  }
  return refreshManagerInstance;
}

// ===== 缓存管理器 =====
export class CacheManager {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private defaultTtl: number = 30000; // 30秒

  set(key: string, value: any, ttl: number = this.defaultTtl) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }
}

let cacheManagerInstance: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager();
  }
  return cacheManagerInstance;
}

// ===== 验证函数 =====
export function validateAddress(address: string): boolean {
  return /^0x[0-9a-f]{40}$/i.test(address);
}

export function validatePositiveNumber(value: string): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0 && isFinite(num);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ===== 类型守卫 =====
export function isApiResponse<T = any>(obj: any): obj is ApiResponse<T> {
  return typeof obj === "object" && obj !== null && "success" in obj;
}

export function isTxResult(obj: any): obj is TxResult {
  return typeof obj === "object" && obj !== null && "success" in obj && "hash" in obj;
}
