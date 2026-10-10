export class ChannelManager {
  subscribeToTable<T extends { [key: string]: any }>(
    tableName: string,
    callback: any,
    filter?: string
  ) {
    console.warn(`[Realtime] Mock subscribe to ${tableName}`);
    return { unsubscribe: () => {} };
  }

  async broadcastEvent(channelName: string, event: string, payload: any) {
    console.warn(`[Realtime] Mock broadcast to ${channelName}`);
  }

  async unsubscribe(channelName: string) {
    console.warn(`[Realtime] Mock unsubscribe ${channelName}`);
  }

  async closeAll() {
    console.warn(`[Realtime] Mock closeAll`);
  }
}

export const realtimeManager = new ChannelManager();
