import json
import requests
import datetime
import hashlib
import traceback
import email_validator

def sendEmail(title, body, person_name, userEmail, recaptcha, clientIP, test=0):
	if test:
		authData = json.load(open("auth.json","r"))
		emailList = [x.strip() for x in open("email/emails.txt","r").read().split("\n")]
	else:
		authData = json.load(open("./model/auth.json","r"))
		emailList = [x.strip() for x in open("./model/email/emails.txt","r").read().split("\n")]

	try:
		validated = email_validator.validate_email(userEmail)
	except:
		return({"error": "The email you have entered cannot be verified."})

	if any([x.lower() in userEmail.lower().split("@")[1] for x in emailList if len(x.strip())]):
		return({"error": "We do not allow contact from disposable email address services."})

	if len(title) > 200: 
		title = title[0:200]
	if len(body) > 5000:
		body = body[0:5000]
	if not userEmail:
		userEmail = "jblewis@ucla.edu"
	if not person_name:
		person_name = userEmail

	if not test:
		try:
			rcTest = json.loads(requests.post("https://www.google.com/recaptcha/api/siteverify", data={"secret": authData["recaptcha"], "response": recaptcha, "remoteip": clientIP}).text)	
			if "success" in rcTest and rcTest["success"] == True:
				pass
			else: # Contacted server fine, but their email is no good.
				return {"error": "Error sending mail. Cannot verify that user is human."}
		except: # Error contacting Google's reCAPTCHA server
			return(traceback.format_exc())
			return {"error": "Error sending mail. Please try again later."}

	headers = {"Authorization": "Bearer "+authData["sendgrid"], "Content-Type": "application/json"}
	topost = {"personalizations": [{"to": [{"email": authData["contact"]}], "subject": title}], "from": {"email": userEmail, "name": person_name}, "content": [{"type": "text/plain", "value": body}]}
	req = requests.post("https://api.sendgrid.com/v3/mail/send", headers=headers, json=topost, verify=False)
	results = req.text

	banned = 0
	if banned: # Banned users should feel like their email was sent fine.
		return {"success": 1}

	if req.status_code==202: # Successful email sent
		return {"success": 1}
	else: # Email failed, store contact in text file for manual check
		try:
			fileName = datetime.datetime.now().strftime("%Y-%m-%d") + "-"+clientIP+"-"+hashlib.sha256(body).hexdigest()[0:10]+".txt"
			with open("email/"+fileName,"w") as f:
				f.write("User email: "+userEmail+"\nTitle: "+title+"\n\n"+body)
			return {"success": 1}
		except: # Error writing to file.
			return {"error": "Error sending email. Please try again later."}

if __name__ == "__main__":
	print sendEmail("Test email from gwu", "test 1234", "binder@gwu.edu", "", "127.0.0.1", 1)
