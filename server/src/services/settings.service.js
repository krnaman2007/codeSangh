// server/src/services/settings.service.js
// DevSync Project Settings Service (Endpoint #68 - Mastermind M5/M6)
// Blueprint Section 7.12 & Page 35

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_STORAGE_DIR = path.resolve(__dirname, '../../storage/settings');

if (!fs.existsSync(SETTINGS_STORAGE_DIR)) {
  fs.mkdirSync(SETTINGS_STORAGE_DIR, { recursive: true });
}

function getSettingsFilePath(projectId) {
  return path.join(SETTINGS_STORAGE_DIR, `${projectId}.json`);
}

/**
 * Retrieves project settings (Endpoint #68)
 * Default settings: { aiEnabled: true }
 */
export async function getProjectSettings(projectId) {
  const filePath = getSettingsFilePath(projectId);
  if (!fs.existsSync(filePath)) {
    return {
      aiEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      aiEnabled: parsed.aiEnabled !== undefined ? Boolean(parsed.aiEnabled) : true,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      aiEnabled: true,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Updates project settings (Endpoint #68)
 * Access: Owner only
 * Emits 'settings:changed' to project room
 */
export async function updateProjectSettings(projectId, { aiEnabled }) {
  const current = await getProjectSettings(projectId);
  const updated = {
    ...current,
    aiEnabled: Boolean(aiEnabled),
    updatedAt: new Date().toISOString(),
  };

  const filePath = getSettingsFilePath(projectId);
  await fs.promises.writeFile(filePath, JSON.stringify(updated, null, 2), 'utf8');

  // Emit settings:changed event to the project room if socket is initialized
  if (global.io) {
    try {
      global.io.to(`project:${projectId}`).emit('settings:changed', {
        projectId,
        settings: {
          aiEnabled: updated.aiEnabled,
        },
      });
    } catch {
      // Ignore broadcast errors in non-socket environments
    }
  }

  return {
    aiEnabled: updated.aiEnabled,
  };
}
