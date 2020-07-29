""" Helpers to pull party data by code. """

from __future__ import print_function
from pymongo import MongoClient
from model.config import config

client = MongoClient()
db = client[config["db"]]


def get_party_data(code, api="Web_Name"):
    """ Return basic party data by party code """
    try:
        code = int(code)
    except Exception:
        return {"error": "Invalid party code requested."}

    fields_return = {x: 1 for x in ["partyname", "count", "fullName",
                                    "pluralNoun", "noun", "briefName",
                                    "party_description", "loyalty_counts"]}
    fields_return["_id"] = 0
    result = db.voteview_parties.find_one({"id": code}, fields_return)

    if not result or result is None or "partyname" not in result:
        return {"error": "Party code not found.", "partyname": None}

    ret_dict = {"partyname": result["partyname"],
                "fullName": result["fullName"],
                "pluralNoun": result["pluralNoun"],
                "noun": result["noun"]}
    if "party_description" in result:
        ret_dict["party_description"] = result["party_description"]
    if "briefName" in result:
        ret_dict["briefName"] = result["briefName"]
    if api == "Web_Person":
        ret_dict["loyalty_counts"] = result["loyalty_counts"]

    return ret_dict


if __name__ == "__main__":
    print(get_party_data(22))
    print(get_party_data("invalid"))
