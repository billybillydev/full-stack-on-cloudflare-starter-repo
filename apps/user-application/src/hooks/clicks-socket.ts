import { durableObjectGeoClickArraySchema } from "@repo/data-ops/zod-schema/links";
import { useEffect, useRef, useState } from "react";
import { useGeoClickStore } from "@/hooks/geo-clicks-store";

const MAX_RETRIES = 5;

export function useClickSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  const { addClicks } = useGeoClickStore();

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const socketHost =
        import.meta.env.VITE_BACKEND_HOST || import.meta.env.VITE_BASE_HOST;
      const socket = new WebSocket(`${protocol}//${socketHost}/click-socket`);

      socket.onopen = () => {
        setIsConnected(true);
        retryCountRef.current = 0;
      };

      socket.onmessage = (event) => {
        // Handle incoming messages
        console.log({ event });
        const data = durableObjectGeoClickArraySchema.parse(
          JSON.parse(event.data),
        );
        console.log({ data });
        addClicks(data);
      };

      socket.onerror = () => {
        console.log('socket error');
      };

      socket.onclose = () => {
        setIsConnected(false);

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.current = socket;
    };

    connect();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { isConnected };
}
