""" Functions related to stashing votes in carts. """

from __future__ import print_function
import uuid
import time
import pymongo
from model.search_votes import query
from model.config import config

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]


def initialize_cart():
    """ Generate a hash and insert it into the database to initialize cart. """

    # What's going on here? UUID is a hash function. It generates a long
    # unique identifier. To save storage and because we're not Facebook sized,
    # I truncate it to the first 8 digits. This gives us ~4 billion possible
    # ids and sparsity as a security mechanism.
    unique_uuid = str(uuid.uuid4())[0:8]

    # Get an expiration date
    expires = update_expiry()

    # Create a stash document.
    db.stash.insert_one({'id': unique_uuid, 'expiry': expires})

    return {'id': unique_uuid}


def add_all(stash_id, search):
    """ Add all votes from search to a given stash cart. """
    results = query(qtext=search, jsapi=0, row_limit=2000, ids_only=1)
    if "rollcalls" not in results:
        return {"errors": ["Can't add votes; no results from search."]}

    rollcall_set = [rollcall["id"] for rollcall in results["rollcalls"]]
    return add_votes(stash_id, rollcall_set)


def delete_all(stash_id, search):
    """ Deletes all current votes from a given stash cart. """
    results = query(qtext=search, jsapi=0, row_limit=2000, ids_only=1)
    if "rollcalls" not in results:
        return {"errors": ["Can't remove votes; no results from search."]}

    rollcall_set = [rollcall["id"] for rollcall in results["rollcalls"]]
    return delete_votes(stash_id, rollcall_set)


def update_expiry():
    """ Returns a new expiry date: current time plus 7 days. """
    return int(time.time()) + (7 * 24 * 60 * 60)


def indefinite_expiry():
    """ Return an expiry date after the sun explodes. """
    return int(time.time()) + (10 * 365 * 24 * 60 * 60)


def check_exists(stash_id):
    """ Check if a stash ID exists. """
    res = db.stash.find_one({'id': stash_id})
    return {"status": int(res is None)}


def add_votes(stash_id, votes):
    """ Add individual vote IDs to a stash. """
    error_messages = []

    # User supplied invalid ID, generate a new one
    if not stash_id or not isinstance(stash_id, str) or len(stash_id) != 8:
        stash_id = initialize_cart()["id"]
        error_messages.append("Invalid stash ID sent from user.")

    expires = update_expiry()

    if isinstance(votes, int):
        votes = [votes]
    elif not isinstance(votes, list):
        error_messages.append("Invalid votes received from user to add.")

    # Pull the current cart
    res = db.stash.find_one({'id': stash_id})
    if res is None:
        # We don't have one.
        error_messages.append("Unknown or expired stash ID sent from user.")
        stash_id = initialize_cart()["id"]
        new_votes = votes
        old = []
        search = ""
    else:
        if "votes" not in res:
            new_votes = votes
        else:
            # Remove votes we already have in the old set
            if "old" in res:
                votes = [v for v in votes if v not in res["old"]]

            # Make sure we have the union of current votes and added votes.
            new_votes = list(set(res["votes"] + votes))

        # Get old and search to return with votes.
        old = res["old"] if "old" in res else []
        search = res["search"] if "search" in res else ""

    # Do the update as necessary.
    db.stash.update_one(
        {'id': stash_id},
        {'$set': {'votes': new_votes, 'expiry': expires}},
        upsert=False)

    # Return everything.
    return {'id': stash_id,
            'votes': new_votes,
            'old': old,
            'search': search,
            'errors': error_messages}


def delete_votes(stash_id, votes):
    """ Add individual vote IDs to a stash. """
    error_messages = []

    # User supplied invalid ID, generate a new one
    if not stash_id or not isinstance(stash_id, str) or len(stash_id) != 8:
        stash_id = initialize_cart()["id"]
        error_messages.append("Invalid stash ID sent from user.")

    expires = update_expiry()

    if isinstance(votes, int):
        votes = [votes]
    elif not isinstance(votes, list):
        error_messages.append("Invalid votes received from user to delete.")

    # Pull the current cart
    res = db.stash.find_one({'id': stash_id})
    if res is None:
        # We don't have one.
        error_messages.append("Unknown or expired stash ID sent from user.")
        stash_id = initialize_cart()["id"]
        new_votes = votes
        old = []
        search = ""
    else:
        new_votes = (
            [v for v in res["votes"] if v not in votes] if "votes" in res else
            [])
        old = (
            [v for v in res["old"] if v not in votes] if "old" in res else
            [])
        search = res["search"] if "search" in res else ""

    db.stash.update_one(
        {'id': stash_id},
        {'$set': {'votes': new_votes, 'old': old, 'expiry': expires}},
        upsert=False)

    return {'id': stash_id,
            'votes': new_votes,
            'errors': error_messages,
            'search': search,
            'old': old}


def empty_cart(stash_id):
    """ Empties a cart. """
    res = db.stash.find_one({'id': stash_id})
    if not res:
        return({'id': '',
                'errorMessages': ["Invalid ID. Cart does not exist."]})

    db.stash.remove({'id': stash_id}, 1)
    return initialize_cart()


def get_votes(stash_id):
    """ Get the votes in the current stash. """
    error_messages = []

    # User supplied invalid ID, generate a new one
    if not stash_id or not isinstance(stash_id, str) or len(stash_id) != 8:
        stash_id = initialize_cart()["id"]
        error_messages.append("Invalid stash ID sent from user.")

    # Pull it
    res = db.stash.find_one({'id': stash_id})
    if res is None:
        # We don't have one.
        error_messages.append("Unknown or expired stash ID sent from user.")
        stash_id = initialize_cart()["id"]
        return {'id': stash_id,
                'votes': [],
                'old': [],
                'search': '',
                'errors': error_messages}

    votes = res["votes"] if "votes" in res else []
    old = res["old"] if "old" in res else []
    search = res["search"] if "search" in res else ""

    return({'id': id,
            'votes': votes,
            'old': old,
            'search': search,
            'errors': error_messages})


def verb_dispatch(verb, stash_id, votes):
    """ Dispatcher for method calls here. """

    if verb == "get":
        return get_votes(stash_id)
    elif verb == "del":
        return delete_votes(stash_id, votes)
    elif verb == "add":
        return add_votes(stash_id, votes)
    elif verb == "init":
        return initialize_cart()
    elif verb == "empty":
        return empty_cart(stash_id)

    return {"error": "Invalid verb."}


def set_search(stash_id, search):
    """ Update search query for a given stash. """

    error_messages = []

    # User supplied invalid ID, generate a new one
    if not stash_id or not isinstance(stash_id, str) or len(stash_id) != 8:
        stash_id = initialize_cart()["id"]
        error_messages.append("Invalid stash ID sent from user.")

    expires = update_expiry()

    res = db.stash.find_one({'id': stash_id})
    if res is None:
        # We don't have one.
        error_messages.append("Unknown or expired stash ID sent from user.")
        stash_id = initialize_cart()["id"]
        saved_vote_ids = []
        votes = []
        old = []
    else:
        old = res["old"] if "old" in res else []
        votes = res["votes"] if "votes" in res else []
        saved_vote_ids = list(set(votes + old))

    if len(search) > 300:
        error_messages.append("Search is too long and not authorized.")
        search = ""

    db.stash.update_one(
        {'id': stash_id},
        {'$set': {'search': search,
                  'old': saved_vote_ids,
                  'votes': [],
                  'expiry': expires}},
        upsert=False)
    return {"id": stash_id,
            "search": search,
            "errors": error_messages,
            "old": saved_vote_ids,
            "votes": []}


def shareable_link(stash_id, text, base_url):
    """ Generate a shareable link. """
    error_messages = []

    internal_text = text.lower()

    if len(internal_text) > 30:
        error_messages.append("Error: Invalid link name.")
    elif len(internal_text) < 4:
        error_messages.append(
            "Error: Link must be at least 4 characters long.")
    if any([x.lower() in internal_text for x in config["swear_data"]]):
        error_messages.append(
            "Error: Link name contains inappropriate term. Links are "
            "public-facing and must not contain swears or abusive words.")

    if db.stash.find_one({'id': internal_text}):
        error_messages.append("Error: Link name already exists.")

    link = ""
    res = db.stash.find_one({'id': stash_id})
    if res is None:
        error_messages.append("Error: Invalid stash ID sent.")
    elif "votes" not in res and "old" not in res:
        error_messages.append("Error: No votes saved.")

    if error_messages:
        return {"link": "", "errors": error_messages}

    votes = res["votes"] if "votes" in res else []
    old = res["old"] if "old" in res else []
    combined_votes = list(set(votes + old))
    expires = indefinite_expiry()
    db.stash.insert_one(
        {'id': internal_text, 'old': combined_votes, 'expiry': expires})
    link = base_url + "s/" + internal_text

    return {"link": link, "errors": error_messages}


if __name__ == "__main__":
    stash_id_test = "3d94a6d6"
    print(add_votes(stash_id_test, ["RS1150001", "RS1150002"]))
