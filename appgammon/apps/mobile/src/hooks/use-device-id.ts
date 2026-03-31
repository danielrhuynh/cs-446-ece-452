/**
 * Hook for managing the device ID
 * Generates a unique ID on first use and persists it
 */

import { useEffect, useState } from "react";
import { getDeviceId, setDeviceId, generateUUID } from "@/lib/storage";

export function useDeviceId() {
  const [deviceId, setDeviceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrCreateDeviceId() {
      let id = await getDeviceId();

      if (!id) {
        id = generateUUID();
        await setDeviceId(id);
      }

      setDeviceIdState(id);
      setIsLoading(false);
    }

    loadOrCreateDeviceId();
  }, []);

  return { deviceId, isLoading };
}
