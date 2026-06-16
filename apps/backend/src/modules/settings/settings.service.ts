import { prisma } from "../../infrastructure/database/prisma";
import type { SettingsInput } from "./settings.schema";

export async function findSettings(userId: string) {
  return prisma.chatbotSettings.findUnique({ where: { userId } });
}

export async function upsertUserSettings(
  userId: string,
  data: SettingsInput,
) {
  return prisma.chatbotSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
