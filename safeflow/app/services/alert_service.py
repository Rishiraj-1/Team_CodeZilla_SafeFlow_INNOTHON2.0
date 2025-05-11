import smtplib
import telebot
from email.mime.text import MIMEText
from app.core.config import settings
from app.schemas.alert import AlertData
import logging

logger = logging.getLogger(__name__)

# Initialize Telegram Bot
try:
    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
        bot = telebot.TeleBot(settings.TELEGRAM_BOT_TOKEN)
    else:
        bot = None
        logger.warning("Telegram bot token or chat ID not configured. Telegram alerts disabled.")
except Exception as e:
    bot = None
    logger.error(f"Failed to initialize Telegram bot: {e}")


def send_email_alert(subject: str, body: str, receiver_email: str):
    if not all([settings.SMTP_SERVER, settings.SMTP_USERNAME, settings.SMTP_PASSWORD, receiver_email]):
        logger.warning("SMTP settings not fully configured. Email alert skipped.")
        return

    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = settings.SMTP_USERNAME
    msg['To'] = receiver_email

    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USERNAME, receiver_email, msg.as_string())
        logger.info(f"Email alert sent to {receiver_email}")
    except Exception as e:
        logger.error(f"Failed to send email alert: {e}")

def send_telegram_alert(message: str):
    if bot and settings.TELEGRAM_CHAT_ID:
        try:
            bot.send_message(settings.TELEGRAM_CHAT_ID, message)
            logger.info(f"Telegram alert sent to chat ID {settings.TELEGRAM_CHAT_ID}")
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")
    else:
        logger.warning("Telegram bot not initialized or chat ID missing. Telegram alert skipped.")


def trigger_alerts(alert_data: AlertData):
    subject = f"SafeFlow Alert: {alert_data.message} in {alert_data.area_name}"
    body = (
        f"SafeFlow System Alert:\n\n"
        f"Camera: {alert_data.camera_name} (ID: {alert_data.camera_id})\n"
        f"Area: {alert_data.area_name}\n"
        f"Mode: {alert_data.mode.value}\n"
        f"Alert: {alert_data.message}\n"
        f"Current Value: {alert_data.current_value}\n"
        f"Threshold: {alert_data.threshold_value}\n"
    )
    
    # Email Alert
    if settings.ALERT_EMAIL_RECEIVER:
        send_email_alert(subject, body, settings.ALERT_EMAIL_RECEIVER)

    # Telegram Alert
    send_telegram_alert(body)

    # On-screen alerts are handled by the frontend based on API responses or WebSocket messages.
    # For this example, we'll rely on frontend polling or status updates in stream data.
    logger.info(f"Alert triggered for {alert_data.camera_name}: {alert_data.message}")