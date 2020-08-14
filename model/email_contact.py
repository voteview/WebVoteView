""" Helpers to send emails on contact page. """

from __future__ import print_function
import base64
import datetime
import hashlib
import json
import email_validator
import requests
from model.config import config


def newsletter_subscribe(user_email, action):
    """ Subscribe or unsubscribe an email address from the newsletter. """
    try:
        auth_data = config["auth"]
        headers = {"Authorization": "Bearer " + auth_data["sendgrid"],
                   "Content-Type": "application/json"}

        parse_email = (
            base64.b64encode(
                user_email.lower().encode("utf-8")
            ).decode("utf-8"))

        # Subscribe
        if action == "subscribe":
            topost = [{"email": parse_email}]
            req = requests.post(
                "https://api.sendgrid.com/v3/contactdb/recipients",
                headers=headers, json=topost)
            if req.status_code == 201:
                return {"success": 1, "verb": "added to"}

            return {"error": (
                "Our email list handler was not able to process your "
                "request at this time.")}

        # Unsubscribe
        topost = [parse_email]
        req = requests.delete(
            "https://api.sendgrid.com/v3/contactdb/recipients",
            headers=headers, json=topost)
        if req.status_code == 204:
            return {"success": 1, "verb": "removed from"}

        return {"error": (
            "Our email list handler was unable to process your request "
            "at this time, but we have added your email to an internal "
            "blacklist to ensure you will not receive any future contacts "
            "from us.")}
    except Exception:
        return {"error": "Unable to send request."}


def validate_email(user_email):
    """ Validates an email address. """
    try:
        email_validator.validate_email(user_email)
    except Exception:
        return {"error": "The email you have entered cannot be verified."}

    try:
        email_list = [x.strip() for x in config["email_bl"]]
    except Exception:
        email_list = []

    if any([x.lower() in user_email.lower().split("@")[1]
            for x in email_list if len(x.strip())]):
        return {"error": (
            "We do not allow contact from disposable email address services.")}

    return {}


def do_recaptcha(secret_key, user_code, user_ip):
    """ Dispatches a Recaptcha request to Google. """
    try:
        recap_result = json.loads(
            requests.post(
                "https://www.google.com/recaptcha/api/siteverify",
                data={"secret": secret_key,
                      "response": user_code,
                      "remoteip": user_ip}).text)

        # Contacted server fine, but their email is no good.
        if "success" not in recap_result or recap_result["success"]:
            return {"error": (
                "Error sending mail. Cannot verify that user is human.")}
    except Exception:
        # Error contacting Google's reCAPTCHA server
        return {"error": "Error sending mail. Please try again later."}

    return {}


def send_email(test=0, **email):
    """ Send us a contact email. """
    auth_data = config["auth"]

    # Check email as valid and unbanned.
    validated_email = validate_email(email["user_email"])
    if "error" in validated_email:
        return validated_email

    # Run the reCAPTCHA if necessary
    if not test:
        recaptcha_result = do_recaptcha(auth_data["recaptcha"],
                                        email["recaptcha"],
                                        email["client_ip"])
        if "error" in recaptcha_result:
            return recaptcha_result

    # Now build the email
    title = email["title"][0:max(200, len(email["title"]))]
    body = email["body"][0:max(5000, len(email["body"]))]
    user_email = email["user_email"] or "jblewis@ucla.edu"
    person_name = email["person_name"] or user_email

    headers = {"Authorization": "Bearer " + auth_data["sendgrid"],
               "Content-Type": "application/json"}
    topost = {"personalizations":
              [{"to": [{"email": auth_data["contact"]}], "subject": title}],
              "from": {"email": user_email, "name": person_name},
              "content": [{"type": "text/plain", "value": body}]}

    req = requests.post("https://api.sendgrid.com/v3/mail/send",
                        headers=headers, json=topost)

    # Successful email sent
    if req.status_code == 202:
        return {"success": 1}

    # Email failed, store contact in text file for manual check
    try:
        file_name = ("%s-%s-%s.txt" %
                     (datetime.datetime.now().strftime("%Y-%m-%d"),
                      email["client_ip"],
                      hashlib.sha256(body).hexdigest()[0:10]))

        with open("email/%s" % file_name, "w") as file_handle:
            file_handle.write(("User email: %s\nTitle: %s\n\n%s" %
                               user_email, title, body))
        return {"success": 1}
    except Exception:  # Error writing to file.
        return {"error": "Error sending email. Please try again later."}


if __name__ == "__main__":
    print(send_email(title="Test email from gwu",
                     body="test 1234",
                     person_name="Test Email",
                     user_email="test_from@gwu.edu",
                     recaptcha="",
                     client_ip="127.0.0.1",
                     test=1))
