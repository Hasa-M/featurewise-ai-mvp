import { registerAs } from '@nestjs/config';

export interface AppConfig {
  readonly nodeEnv: string;
  readonly port: number;
  readonly serviceName: string;
}

const DEFAULT_PORT = 3000;

export function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === '') {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return DEFAULT_PORT;
  }

  return port;
}

export const appConfig = registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parsePort(process.env.PORT),
    serviceName: 'featurewise-backend',
  }),
);
