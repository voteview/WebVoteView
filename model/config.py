""" Shareable configuration cache """

import json
import os

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

# Maximum congress from JSON file.
if os.path.join(BASE_DIR, "../static/config.json"):
    MAX_CONGRESS = json.load(open(
        os.path.join(BASE_DIR, "../static/config.json"), "r"))["maxCongress"]
else:
    MAX_CONGRESS = 116

# Are we a development server?
SERVER_TYPE = (0
               if not os.path.isfile(os.path.join(BASE_DIR, "../server.txt"))
               else int(open("server.txt", "r").read().strip()))

# Authentication and API data
AUTH_DATA = (json.load(open(os.path.join(BASE_DIR, "auth.json"), "r")) if
             os.path.isfile(os.path.join(BASE_DIR, "auth.json")) else {})

# English nicknames
NICKNAMES = json.load(open(os.path.join(BASE_DIR, "nicknames.json"), "r"))

# State data
STATES = json.load(open(os.path.join(BASE_DIR, "states.json"), "r"))

# Swear filters for stash names
# Swear filter is a combination of:
# https://gist.github.com/jamiew/1112488
# https://gist.github.com/tjrobinson/2366772
SWEAR_DATA = (
    json.load(open(os.path.join(BASE_DIR, "swearFilter.json"), "r"))["swears"]
    if os.path.isfile(os.path.join(BASE_DIR, "swearFilter.json")) else [])

# DB Connection name.
DB_DATA = json.load(open(os.path.join(BASE_DIR, "db.json"), "r"))

# Stop words for searches
STOP_WORDS = open(os.path.join(BASE_DIR, "stop_words.txt"), "r").readlines()

# Email blacklist
EMAIL_BLACKLIST = open(
    os.path.join(BASE_DIR, "email/emails.txt"), "r").readlines()

# Slides
SLIDES = json.load(open(
    os.path.join(BASE_DIR, "../static/carousel/slides.json"), "r"))

config = {  # pylint: disable=C0103
    "max_congress": MAX_CONGRESS,
    "server": SERVER_TYPE,
    "auth": AUTH_DATA,
    "nicknames": NICKNAMES,
    "states": STATES,
    "swear": SWEAR_DATA,
    "db_name": DB_DATA["db_name"],
    "db_host": DB_DATA["db_host"],
    "db_port": DB_DATA["db_port"],
    "db_name_geog": DB_DATA["db_name_geog"],
    "stop_words": STOP_WORDS,
    "email_bl": EMAIL_BLACKLIST,
    "slides": SLIDES,
    "transition_alert": 0
}
