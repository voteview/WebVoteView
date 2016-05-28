import json
import requests
import datetime
import hashlib
import traceback

def sendEmail(title, body, userEmail, recaptcha, clientIP, test=0):
	if test:
		authData = json.load(open("auth.json","r"))
	else:
		authData = json.load(open("./model/auth.json","r"))

	if len(title) > 200: 
		title = title[0:200]
	if len(body) > 5000:
		body = body[0:5000]
	if not userEmail:
		userEmail = "contact@voteview.polisci.ucla.edu"

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
	topost = {"personalizations": [{"to": [{"email": authData["contact"]}], "subject": title}], "from": {"email": "contact@voteview.polisci.ucla.edu"}, "content": [{"type": "text", "value": body}]}
	req = requests.post("https://api.sendgrid.com/v3/mail/send/beta", headers=headers, json=topost, verify=False)
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
	print sendEmail("Test", "test 1234", "rudkin@ucla.edu", "", "124", 1)
