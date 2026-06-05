type Listener = () => void;

let homeStatsListeners: Listener[] = [];

export function subscribeHomeStats(listener: Listener): () => void {
  homeStatsListeners.push(listener);
  return () => {
    homeStatsListeners = homeStatsListeners.filter((l) => l !== listener);
  };
}

export function notifyHomeStatsRefresh(): void {
  for (const listener of homeStatsListeners) {
    listener();
  }
}
