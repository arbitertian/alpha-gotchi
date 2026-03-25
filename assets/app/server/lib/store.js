import fs from "node:fs/promises";
import path from "node:path";

export async function ensureRuntime(runtimeHome) {
  const root = runtimeHome;
  const dataDir = path.join(root, "data");
  const logDir = path.join(root, "logs");
  const appDir = path.join(root, "app");
  const stateFile = path.join(dataDir, "snapshot.json");
  const eventsFile = path.join(dataDir, "events.jsonl");
  const settingsFile = path.join(dataDir, "settings.json");
  const demoFile = path.join(dataDir, "demo-state.json");

  await Promise.all([
    fs.mkdir(root, { recursive: true }),
    fs.mkdir(dataDir, { recursive: true }),
    fs.mkdir(logDir, { recursive: true }),
    fs.mkdir(appDir, { recursive: true })
  ]);

  return {
    root,
    dataDir,
    logDir,
    appDir,
    stateFile,
    eventsFile,
    settingsFile,
    demoFile
  };
}

export async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

export async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

export async function appendJsonl(filePath, value) {
  await fs.appendFile(filePath, `${JSON.stringify(value)}\n`);
}

export async function readJsonl(filePath, limit = 100) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit);
    return lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
