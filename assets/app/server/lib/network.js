import os from "node:os";

export function getLanIps() {
  const candidates = [];
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4" || entry.internal) {
        continue;
      }
      if (entry.address.startsWith("169.254.")) {
        continue;
      }
      candidates.push(entry.address);
    }
  }

  return [...new Set(candidates)];
}
