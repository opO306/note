interface ExtendedNotificationOptions extends NotificationOptions {
    renotify?: boolean;
    actions?: NotificationAction[];
}

interface NotificationAction {
    action: string;
    title: string;
    icon?: string;
}
