""" Shareable configuration cache """

import json
import os
import pymongo

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

# Maximum congress from JSON file.
CONFIG_PATH = os.path.join(BASE_DIR, "../static/config.json")
if os.path.isfile(CONFIG_PATH):
    MAX_CONGRESS = json.load(open(CONFIG_PATH, "r"))["max_congress"]
else:
    MAX_CONGRESS = 117

# Are we a development server?
SERVER_PATH = os.path.join(BASE_DIR, "../server.txt")
SERVER_TYPE = (0
               if not os.path.isfile(SERVER_PATH)
               else int(open(SERVER_PATH, "r").read().strip()))

# Authentication and API data
AUTH_DATA = (json.load(open(os.path.join(BASE_DIR, "auth.json"), "r")) if
             os.path.isfile(os.path.join(BASE_DIR, "auth.json")) else
             json.load(open(os.path.join(BASE_DIR, "auth_blank.json"), "r")) if
             os.path.isfile(os.path.join(BASE_DIR, "auth_blank.json")) else
             {})

# English nicknames
NICKNAMES = json.load(open(os.path.join(BASE_DIR, "nicknames.json"), "r"))

# State data
STATES = json.load(open(os.path.join(BASE_DIR, "states.json"), "r"))

# Swear filters for stash names
# Swear filter is a combination of:
# https://gist.github.com/jamiew/1112488
# https://gist.github.com/tjrobinson/2366772
SWEAR_DATA = (
    json.load(open(os.path.join(BASE_DIR, "swear_filter.json"), "r"))["swears"]
    if os.path.isfile(os.path.join(BASE_DIR, "swear_filter.json")) else [])

# DB Connection name.
DB_DATA = json.load(open(os.path.join(BASE_DIR, "db.json"), "r"))

# Stop words for searches
STOP_WORDS = open(os.path.join(BASE_DIR, "stop_words.txt"), "r").readlines()

# Email blacklist
EMAIL_BLACKLIST = open(
    os.path.join(BASE_DIR, "email/emails.txt"), "r").readlines()

# Slides
SLIDES = (
    json.load(open(os.path.join(BASE_DIR, "../static/carousel/slides.json"), "r")) if
    os.path.isfile(os.path.join(BASE_DIR, "../static/carousel/slides.json")) else
    [])

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
    "db_username": DB_DATA["db_username"],
    "db_pwd": DB_DATA["db_pwd"],
    "stop_words": STOP_WORDS,
    "email_bl": EMAIL_BLACKLIST,
    "slides": SLIDES,
    "transition_alert": 0
}

# Shared MongoDB client with connection pooling and optimized settings for fast reads
mongo_client = pymongo.MongoClient(
    host=config["db_host"],
    port=config["db_port"],
    # Connection pool settings
    maxPoolSize=100,  # Increased for higher concurrency
    minPoolSize=20,   # More pre-warmed connections for instant availability
    maxIdleTimeMS=60000,  # Keep connections alive for 60s
    # Timeout settings
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    socketTimeoutMS=30000,
    waitQueueTimeoutMS=5000,
    # Retry settings for resilience
    retryWrites=True,
    retryReads=True,
    # Read optimization settings
    readPreference='primaryPreferred',  # Read from primary, fallback to secondary
    readconcernlevel='local',  # Fastest read concern
    # Network compression for faster data transfer
    compressors=['zstd', 'snappy', 'zlib'],
    # Direct connection for single-server deployments (faster)
    directConnection=True if config["db_host"] == "localhost" else False,
)
db = mongo_client[config["db_name"]]
db_geog = mongo_client[config["db_name_geog"]]

# Warm up the connection pool by pinging the database
# This ensures the first user request doesn't wait for connection establishment
try:
    mongo_client.admin.command('ping')
except Exception:
    pass  # Server might not be available during testing

# Pre-create indexes for common queries (idempotent operations)
def _ensure_indexes():
    """Create indexes at startup for optimal query performance."""
    try:
        # Index for member exports and lookups
        db.voteview_members.create_index(
            [('state_abbrev', 1), ('district_code', 1), ('icpsr', 1)],
            name="ordIndex",
            background=True
        )
        # Index for congress lookups
        db.voteview_members.create_index(
            [('congress', -1)],
            name="congressIndex",
            background=True
        )
        # Index for chamber + congress lookups
        db.voteview_members.create_index(
            [('chamber', 1), ('congress', -1)],
            name="chamberCongressIndex",
            background=True
        )
        # Index for ICPSR lookups (common in person pages)
        db.voteview_members.create_index(
            [('icpsr', 1)],
            name="icpsrIndex",
            background=True
        )
        # Index for rollcall date sorting and pagination
        db.voteview_rollcalls.create_index(
            [('date_chamber_rollnumber', -1)],
            name="dateChRnIndex",
            background=True
        )
        # Index for quota session lookups
        db.api_quota.create_index(
            [('session', 1)],
            name="sessionIndex",
            background=True
        )
        # Index for articles
        db.voteview_articles.create_index(
            [('hidden', 1), ('title', 1)],
            name="articlesIndex",
            background=True
        )
        # Index for metadata time sorting
        db.voteview_metadata.create_index(
            [('time', -1)],
            name="metadataTimeIndex",
            background=True
        )
    except Exception:
        pass  # Indexes may already exist or server unavailable

_ensure_indexes()

# In-memory cache for frequently accessed data
_cache = {
    "metadata": None,
    "metadata_time": 0,
    "articles": None,
    "articles_time": 0,
}
CACHE_TTL = 300  # 5 minutes cache TTL


def get_cached_metadata():
    """Return cached metadata, refreshing if stale."""
    import time
    now = time.time()
    if _cache["metadata"] is None or (now - _cache["metadata_time"]) > CACHE_TTL:
        for meta_attribute in db.voteview_metadata.find(
                {},
                {"loyalty_counts": 0}).sort('time', -1).limit(1):
            _cache["metadata"] = meta_attribute
            _cache["metadata_time"] = now
            break
    return _cache["metadata"]


def get_cached_articles():
    """Return cached articles list, refreshing if stale."""
    import time
    now = time.time()
    if _cache["articles"] is None or (now - _cache["articles_time"]) > CACHE_TTL:
        rows = db.voteview_articles.find(
            {"hidden": {"$ne": 1}},
            {"_id": 0}
        ).sort("title", 1)
        _cache["articles"] = list(rows)
        _cache["articles_time"] = now
    return _cache["articles"]
