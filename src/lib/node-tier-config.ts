import { ethers } from "ethers";

export type SerializedNftaTier = {
  id: number;
  price: string;
  dailyYield: string;
  maxSupply: string;
  currentSupply: string;
  isActive: boolean;
  remaining: string;
};

export type SerializedNftbTier = {
  id: number;
  price: string;
  weight: string;
  maxSupply: string;
  usdtMinted: string;
  tofMinted: string;
  dividendBps: string;
  isActive: boolean;
  usdtRemaining: string;
  tofRemaining: string;
};

const toUnitsString = (value: string) => ethers.parseUnits(value, 18).toString();

export const FIXED_NFTA_TIER_SPECS = [
  { id: 1, price: "500", dailyYield: "6.5", maxSupply: "10000", isActive: true },
  { id: 2, price: "1000", dailyYield: "20", maxSupply: "5000", isActive: true },
] as const;

export const FIXED_NFTB_TIER_SPECS = [
  { id: 1, price: "500", weight: "1", maxSupply: "2000", dividendBps: "2000", isActive: true, usdtQuota: "1000", tofQuota: "1000" },
  { id: 2, price: "1000", weight: "2", maxSupply: "2000", dividendBps: "3000", isActive: true, usdtQuota: "1000", tofQuota: "1000" },
  { id: 3, price: "2000", weight: "3", maxSupply: "2000", dividendBps: "4000", isActive: true, usdtQuota: "1000", tofQuota: "1000" },
] as const;

export function createDefaultSerializedNftaTiers(): SerializedNftaTier[] {
  return FIXED_NFTA_TIER_SPECS.map((tier) => ({
    id: tier.id,
    price: toUnitsString(tier.price),
    dailyYield: toUnitsString(tier.dailyYield),
    maxSupply: tier.maxSupply,
    currentSupply: "0",
    isActive: tier.isActive,
    remaining: tier.maxSupply,
  }));
}

export function createDefaultSerializedNftbTiers(): SerializedNftbTier[] {
  return FIXED_NFTB_TIER_SPECS.map((tier) => ({
    id: tier.id,
    price: toUnitsString(tier.price),
    weight: tier.weight,
    maxSupply: tier.maxSupply,
    usdtMinted: "0",
    tofMinted: "0",
    dividendBps: tier.dividendBps,
    isActive: tier.isActive,
    usdtRemaining: tier.usdtQuota,
    tofRemaining: tier.tofQuota,
  }));
}
