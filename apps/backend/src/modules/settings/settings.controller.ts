import { Request, Response } from "express";
import { settingsSchema, DEFAULT_SETTINGS } from "./settings.schema";
import { findSettings, upsertUserSettings } from "./settings.service";

export async function getSettings(req: Request, res: Response): Promise<void> {
  const settings = await findSettings(req.userId!);
  res.json({ settings: settings ?? DEFAULT_SETTINGS });
}

export async function upsertSettings(
  req: Request,
  res: Response,
): Promise<void> {
  const data = settingsSchema.parse(req.body);
  const settings = await upsertUserSettings(req.userId!, data);
  res.json({ settings });
}
