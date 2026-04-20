export interface TimelineEvent {
  id: string;
  timestamp: number;
  date: Date;
  label: string;
  path: string;
  data: unknown;
  x?: number;
  y?: number;
}

export interface TimelineData {
  events: TimelineEvent[];
  minTime: number;
  maxTime: number;
  timeRange: number;
}

const TIMESTAMP_FIELDS = [
  "timestamp",
  "time",
  "date",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
  "deletedAt",
  "deleted_at",
  "publishedAt",
  "published_at",
  "startTime",
  "start_time",
  "endTime",
  "end_time",
  "eventTime",
  "event_time",
  "occurredAt",
  "occurred_at",
  "loggedAt",
  "logged_at",
];

function parseTimestamp(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (value > 1e12) {
      return value;
    }
    if (value > 1e9) {
      return value * 1000;
    }
    return value;
  }

  if (typeof value === "string") {
    const num = Number(value);
    if (!isNaN(num)) {
      if (num > 1e12) {
        return num;
      }
      if (num > 1e9) {
        return num * 1000;
      }
      return num;
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }

  return null;
}

function findTimestampField(obj: Record<string, unknown>): { field: string; value: number } | null {
  for (const field of TIMESTAMP_FIELDS) {
    if (obj[field] !== undefined) {
      const timestamp = parseTimestamp(obj[field]);
      if (timestamp !== null) {
        return { field, value: timestamp };
      }
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    const timestamp = parseTimestamp(value);
    if (timestamp !== null) {
      return { field: key, value: timestamp };
    }
  }

  return null;
}

function generateEventLabel(obj: Record<string, unknown>, path: string): string {
  const labelFields = [
    "title",
    "name",
    "message",
    "description",
    "event",
    "action",
    "type",
    "status",
    "level",
  ];

  for (const field of labelFields) {
    if (obj[field] !== undefined && obj[field] !== null) {
      const value = String(obj[field]);
      if (value.length > 0) {
        return value.length > 50 ? value.slice(0, 50) + "..." : value;
      }
    }
  }

  return path;
}

function extractEventsFromArray(
  arr: unknown[],
  path: string,
  events: TimelineEvent[]
): TimelineEvent[] {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const itemPath = `${path}[${i}]`;

    if (item === null || item === undefined) continue;

    if (typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const timestampInfo = findTimestampField(obj);

      if (timestampInfo) {
        events.push({
          id: itemPath,
          timestamp: timestampInfo.value,
          date: new Date(timestampInfo.value),
          label: generateEventLabel(obj, itemPath),
          path: itemPath,
          data: item,
        });
      }

      extractEvents(obj, itemPath, events);
    }
  }

  return events;
}

function extractEvents(
  obj: Record<string, unknown>,
  path: string,
  events: TimelineEvent[]
): TimelineEvent[] {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path === "$" ? `${path}.${key}` : `${path}.${key}`;

    if (value === null || value === undefined) continue;

    if (Array.isArray(value)) {
      extractEventsFromArray(value, currentPath, events);
    } else if (typeof value === "object") {
      const nestedObj = value as Record<string, unknown>;
      const timestampInfo = findTimestampField(nestedObj);

      if (timestampInfo) {
        events.push({
          id: currentPath,
          timestamp: timestampInfo.value,
          date: new Date(timestampInfo.value),
          label: generateEventLabel(nestedObj, currentPath),
          path: currentPath,
          data: value,
        });
      }

      extractEvents(nestedObj, currentPath, events);
    }
  }

  return events;
}

export function buildTimelineData(json: unknown): TimelineData {
  const events: TimelineEvent[] = [];

  if (json === null || json === undefined) {
    return { events: [], minTime: 0, maxTime: 0, timeRange: 0 };
  }

  if (Array.isArray(json)) {
    extractEventsFromArray(json, "$", events);
  } else if (typeof json === "object") {
    const obj = json as Record<string, unknown>;

    const timestampInfo = findTimestampField(obj);
    if (timestampInfo) {
      events.push({
        id: "$",
        timestamp: timestampInfo.value,
        date: new Date(timestampInfo.value),
        label: generateEventLabel(obj, "$"),
        path: "$",
        data: json,
      });
    }

    extractEvents(obj, "$", events);
  }

  events.sort((a, b) => a.timestamp - b.timestamp);

  if (events.length === 0) {
    return { events: [], minTime: 0, maxTime: 0, timeRange: 0 };
  }

  const minTime = events[0].timestamp;
  const maxTime = events[events.length - 1].timestamp;
  const timeRange = maxTime - minTime;

  return {
    events,
    minTime,
    maxTime,
    timeRange,
  };
}

export function formatTime(timestamp: number, format: "full" | "date" | "time" = "full"): string {
  const date = new Date(timestamp);

  switch (format) {
    case "date":
      return date.toLocaleDateString();
    case "time":
      return date.toLocaleTimeString();
    default:
      return date.toLocaleString();
  }
}

export function calculateTimelineLayout(
  data: TimelineData,
  width: number,
  height: number,
  padding: { left: number; right: number; top: number; bottom: number } = {
    left: 60,
    right: 60,
    top: 80,
    bottom: 80,
  }
): TimelineEvent[] {
  const { events, minTime, timeRange } = data;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const laidOutEvents = events.map((event, index) => {
    let x: number;
    if (timeRange === 0) {
      x = padding.left + chartWidth / 2;
    } else {
      x = padding.left + ((event.timestamp - minTime) / timeRange) * chartWidth;
    }

    const rowCount = Math.min(events.length, 10);
    const rowHeight = chartHeight / Math.max(rowCount, 1);
    const y = padding.top + (index % rowCount) * rowHeight + rowHeight / 2;

    return {
      ...event,
      x,
      y,
    };
  });

  return laidOutEvents;
}
