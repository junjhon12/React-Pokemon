import { type StatKey } from "./pokemon";

export type Equipment = {
    id: string;
    name: string;
    description: string;
    spriteUrl: string;
    statModifiers: Partial<Record<StatKey, number>>;
}