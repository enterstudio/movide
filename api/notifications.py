from models import RatingNotification, MessageNotification, Message

NOTIFICATION_TYPES = {
    'reply_to_discussion': "{origin_user} replied to your discussion!",
    'reply_to_watched_thread': "{origin_user} replied to a discussion that you are watching.",
    'rating_for_discussion': "{origin_user} liked your discussion.",
    'instructor_discussion_started': "Your course instructor started a new discussion."
}

class InvalidNotificationType(Exception):
    pass

class NotificationText(object):
    def __init__(self, notifications):
        self.notifications = notifications

    def generate_text(self):
        self.notification_text = []
        for n in self.notifications:
            if isinstance(n, RatingNotification):
                self.notification_text.append(self.generate_text_rating(n))
            elif isinstance(n, MessageNotification):
                self.notification_text.append(self.generate_text_message(n))
            else:
                error_message = "Invalid notification type passed to NotificationText."
                raise InvalidNotificationType(error_message)

    def generate_text_message(self, notification):
        return NOTIFICATION_TYPES[notification.notification_type].format(origin_user=notification.origin_message.user)

    def generate_text_rating(self, notification):
        return NOTIFICATION_TYPES[notification.notification_type].format(origin_user=notification.origin_rating.user)

    def get_messages(self):
        messages = []
        for i,n in enumerate(self.notifications):
            messages.append({'message' : n.receiving_message, 'notification_text' : self.notification_text[i], 'notification' : n})
        return messages
