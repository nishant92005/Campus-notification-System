import type { CampusNotification, NotificationType } from "./types";

export const priorityWeight: Record<NotificationType, number> = {
  Placement: 3,
  Result: 2,
  Event: 1
};

export function sortByPriority(notifications: CampusNotification[]) {
  return [...notifications].sort((left, right) => {
    const weightDelta = priorityWeight[right.type] - priorityWeight[left.type];
    if (weightDelta !== 0) {
      return weightDelta;
    }
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });
}

