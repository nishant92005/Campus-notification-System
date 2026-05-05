export type NotificationType = "Placement" | "Result" | "Event";

export interface CampusNotification {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface NotificationFilters {
  type: NotificationType | "All";
  page: number;
  pageSize: number;
}

export interface NotificationPage {
  items: CampusNotification[];
  total: number;
}

