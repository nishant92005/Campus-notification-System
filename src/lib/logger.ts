type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, string | number | boolean | null | undefined>;

interface LogEvent {
  level: LogLevel;
  event: string;
  timestamp: string;
  fields?: LogFields;
}

class ClientLogger {
  private buffer: LogEvent[] = [];

  info(event: string, fields?: LogFields) {
    this.capture("info", event, fields);
  }

  warn(event: string, fields?: LogFields) {
    this.capture("warn", event, fields);
  }

  error(event: string, fields?: LogFields) {
    this.capture("error", event, fields);
  }

  drain() {
    const entries = [...this.buffer];
    this.buffer = [];
    return entries;
  }

  private capture(level: LogLevel, event: string, fields?: LogFields) {
    this.buffer.push({
      level,
      event,
      timestamp: new Date().toISOString(),
      fields
    });
  }
}

export const logger = new ClientLogger();

