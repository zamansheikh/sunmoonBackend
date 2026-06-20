export interface IDisconnectPayload {
  event: "user:disconnected";
  userId: number;
  finalBalance: number;
  sessionToken: string;
  gameId: string;
  disconnectedAt: string;
}
