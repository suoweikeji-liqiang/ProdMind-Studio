export type ProviderEvent = {
  provider: string;
  model: string;
  operation: 'streamText' | 'generateStructured';
  startTime: number;
  endTime?: number;
  success?: boolean;
  error?: string;
};

export type ProviderObserver = (event: ProviderEvent) => void;

let observer: ProviderObserver | null = null;

export function setProviderObserver(obs: ProviderObserver): void {
  observer = obs;
}

export function notifyProviderEvent(event: ProviderEvent): void {
  if (observer) {
    observer(event);
  }
}
