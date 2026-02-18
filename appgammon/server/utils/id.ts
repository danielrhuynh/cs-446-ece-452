import { customAlphabet } from "nanoid";

export const generateId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", 6);