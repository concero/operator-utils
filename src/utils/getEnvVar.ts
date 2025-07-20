import { Address } from "viem";
import process from "process";
import { type env } from "../types/env";


export function getEnvVar<K extends keyof env>(key: K): env[K] {
    const value = process.env[key];
    if (value === undefined || value === "") throw new Error(`Missing environment variable ${key}`);
    return value as env[K];
}
