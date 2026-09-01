import { useEffect, useState } from "react";
import { getRealtimeSocket } from "../services/realtime";

/**
 * Tracks whether the shared live-update socket is currently connected —
 * used to show a small "you're getting live updates" indicator in the UI.
 */
export function useRealtimeConnected() {
  const socket = getRealtimeSocket();
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    function handleConnect() {
      setIsConnected(true);
    }

    function handleDisconnect() {
      setIsConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket]);

  return isConnected;
}
