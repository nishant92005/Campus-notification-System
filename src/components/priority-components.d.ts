declare module "@/components/PriorityNotificationsPage" {
  export default function PriorityNotificationsPage(): JSX.Element;
}

declare module "@/components/PriorityControls" {
  const PriorityControls: React.ComponentType<{
    limit: number;
    page: number;
    type: string;
    totalPages: number;
    onLimitChange: (limit: number) => void;
    onPageChange: (page: number) => void;
    onTypeChange: (type: string) => void;
  }>;

  export default PriorityControls;
}

declare module "@/components/PriorityNotificationCard" {
  const PriorityNotificationCard: React.ComponentType<{
    notification: {
      id: string;
      type: string;
      message: string;
      timestamp: string;
      priority: number;
    };
    isRead: boolean;
    onMarkRead: (id: string) => void;
  }>;

  export default PriorityNotificationCard;
}

