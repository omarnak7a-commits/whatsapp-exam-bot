from typing import Optional, Dict, Any


class WebhookParser:
    @staticmethod
    def parse_incoming_message(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parses Meta WhatsApp Cloud API webhook JSON payload.
        Returns dict with sender_phone, sender_name, message_id, msg_type, content, button_id.
        """
        try:
            entry = payload.get("entry", [])[0]
            changes = entry.get("changes", [])[0]
            value = changes.get("value", {})
            messages = value.get("messages", [])
            contacts = value.get("contacts", [])

            if not messages:
                return None

            msg = messages[0]
            sender_phone = msg.get("from", "")
            message_id = msg.get("id", "")
            msg_type = msg.get("type", "")

            sender_name = "طالب"
            if contacts:
                profile = contacts[0].get("profile", {})
                sender_name = profile.get("name", sender_name)

            parsed_data = {
                "sender_phone": sender_phone,
                "sender_name": sender_name,
                "message_id": message_id,
                "msg_type": msg_type,
                "text": "",
                "callback_id": "",
            }

            if msg_type == "text":
                parsed_data["text"] = msg.get("text", {}).get("body", "").strip()
            elif msg_type == "interactive":
                interactive = msg.get("interactive", {})
                int_type = interactive.get("type", "")
                if int_type == "button_reply":
                    parsed_data["callback_id"] = interactive.get("button_reply", {}).get("id", "")
                elif int_type == "list_reply":
                    parsed_data["callback_id"] = interactive.get("list_reply", {}).get("id", "")
            elif msg_type == "button":
                parsed_data["callback_id"] = msg.get("button", {}).get("payload", "")

            return parsed_data
        except Exception:
            return None
