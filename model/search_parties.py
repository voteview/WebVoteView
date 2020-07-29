""" Helper functions to search or lookup party information. """

from __future__ import print_function
import pymongo
from model.config import config

cache = {}

client = pymongo.MongoClient()
db = client[config["db"]]


def party_lookup_id(query_dict, api):
    """ Lookup party directly by id. """
    party = db.voteview_parties.find_one(
        {"id": query_dict["id"]},
        {"_id": 0, "id": 1, "count": 1, "fullName": 1,
         "colorScheme": 1, "minCongress": 1, "maxCongress": 1,
         "partyname": 1, "noun": 1, "loyalty_counts": 1})

    if api == "Web_Members" and party:
        return party['loyalty_counts']

    if party and "colorScheme" not in party:
        party["colorScheme"] = "grey"

    if not party:
        return {}

    return {"results": [party]}


def party_lookup(query_dict, api):
    """ Lookup party using a query dictionary. """
    if api not in ["Web_FP_Search", "exportCSV", "Web_Members"]:
        return {}

    if "id" not in query_dict and "name" not in query_dict:
        return {}

    if "id" in query_dict:
        return party_lookup_id(query_dict, api)

    elif "name" in query_dict:
        parties = db.voteview_parties.find(
            {"fullName": {"$regex": ".*%s.*" % query_dict["name"],
                          "$options": "i"}},
            {"_id": 0, "id": 1, "count": 1, "fullName": 1,
             "colorScheme": 1, "minCongress": 1, "maxCongress": 1,
             "partyname": 1, "noun": 1})
        party_set = []
        for party in parties:
            if party and "colorScheme" not in party:
                party["colorScheme"] = "grey"

            party_set.append(party)
        if party_set:
            return {"results": party_set}

        return {}

    return {}


def party_noun(party_id):
    """ Return party noun form by ID. """
    if str(party_id) in cache:
        return cache[str(party_id)]["noun"]

    results = party_lookup({"id": party_id}, "Web_FP_Search")
    if "results" in results:
        cache[str(party_id)] = results["results"][0]
        return results["results"][0]["noun"]

    return "Error Noun " + str(party_id)


def party_name(party_id):
    """ Return party full name by ID. """
    if str(party_id) in cache:
        return cache[str(party_id)]["fullName"]

    results = party_lookup({"id": party_id}, "Web_FP_Search")
    if "results" in results:
        cache[str(party_id)] = results["results"][0]
        return results["results"][0]["fullName"]

    return "Error Party " + str(party_id)


def short_name(party_id):
    """ Return short name for party by ID. """
    if str(party_id) in cache:
        return cache[str(party_id)]["partyname"]

    results = party_lookup({"id": party_id}, "Web_FP_Search")
    if "results" in results:
        cache[str(party_id)] = results["results"][0]
        return results["results"][0]["partyname"]

    return "party " + str(party_id)


def party_color(party_id):
    """ Get colour scheme for party by ID. """
    if str(party_id) in cache:
        return cache[str(party_id)]["colorScheme"]

    results = party_lookup({"id": party_id}, "Web_FP_Search")
    if "results" in results:
        cache[str(party_id)] = results["results"][0]
        return results["results"][0]["colorScheme"]

    return "grey"


if __name__ == "__main__":
    print(party_lookup({"id": 200}, "Web_Members"))
    # print noun(5000)
    # print partyName(347)
    # print partyLookup({"name": "democrat"}, "Web_FP_Search")
