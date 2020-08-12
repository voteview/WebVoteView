""" Helper methods to search members. """

import os
import pymongo
from model.state_helper import (state_name_to_abbrev, get_state_name,
                                state_icpsr)
from model.search_parties import (party_name, party_noun,
                                  party_color, short_name)
from model.slugify import slugify
from model.config import config

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]


def cqlabel(state_abbrev, district_code):
    """ Congressional district label text for a given state and district. """
    if state_abbrev == "USA":
        label_text = "(POTUS)"
    elif district_code > 70:
        label_text = "(%s-00)" % state_abbrev
    elif district_code and district_code <= 70:
        label_text = "(%s-%02d)" % (state_abbrev, district_code)
    elif district_code == 0:
        label_text = "(%s)" % state_abbrev
    else:
        label_text = ""
    return label_text


def get_field_set(api, search_query):
    """ Returns the fields that the particular API requires. """
    field_set_dict = {
        "Web_PI": ["nominate.dim1", "party_code", "district_code", "icpsr",
                   "chamber", "nvotes_yea_nay", "nvotes_against_party",
                   "nvotes_abs"],
        "Web_FP_Search": ["bioname", "party_code", "icpsr", "state_abbrev",
                          "congress", "congresses", "chamber", "bioguide_id"],
        "Check_Party_Switch": ["icpsr"],
        "Web_Party": ["bioname", "party_code", "icpsr", "state_abbrev",
                      "congress", "bioImgURL", "minElected", "nominate.dim1",
                      "nominate.dim2", "congresses", "chamber"],
        "R": ["bioname", "party_code", "icpsr", "state_abbrev", "congress",
              "id", "nominate.dim1", "nominate.dim2",
              "nominate.geo_mean_probability", "cqlabel", "district_code",
              "chamber", "congresses"],
        "exportCSV": ["bioname", "party_code", "icpsr", "state_abbrev",
                      "congress", "id", "nominate", "district_code",
                      "chamber", "state_name_trunc", "last_means",
                      "occupancy", "name"],
        "exportORD": ["bioname", "party_code", "icpsr", "state_abbrev",
                      "congress", "id", "nominate", "district_code",
                      "chamber", "state_name_trunc", "last_means",
                      "occupancy", "name"],
        "districtLookup": ["bioname", "party_code", "icpsr", "state_abbrev",
                           "congress", "id", "nominate.dim1", "nominate.dim2",
                           "district_code", "chamber", "congresses"],
        "Web_Congress": ["bioname", "party_code", "icpsr", "state_abbrev",
                         "congress", "bioImgURL", "minElected",
                         "nominate.dim1", "nominate.dim2", "congresses",
                         "elected_senate", "elected_house"]
    }
    if api in field_set_dict:
        field_set = {key: 1 for key in field_set_dict[api]}
    else:
        field_set = {"personid": 0}
    field_set["_id"] = 0
    if "$text" in search_query:
        field_set["score"] = {"$meta": "textScore"}
    return field_set


def get_search_query(query_dict, api):
    """ Maps a user query dict into MongoDB search. """

    # Setup so that the bottle call to this API doesn't need to know parameters
    # we accept explicitly -- so copy only these keys into the query dict.
    copy_keys = ["name", "icpsr", "state_abbrev", "congress",
                 "chamber", "party_code", "bioguide_id", "district_code",
                 "id", "speaker", "freshman", "id_in", "biography"]
    query_dict = {key: query_dict[key] for key in copy_keys
                  if key in query_dict}

    # Check to make sure there's a query
    if not query_dict:
        return {}, {"errormessage": "No search terms provided"}

    # Okay, next, let's take what the user search for and translate it into
    # an appropriate MongoDB search.
    search_query = {}
    if api == "districtLookup" and "id_in" in query_dict:
        search_query["id"] = {"$in": query_dict["id_in"]}

    if "icpsr" in query_dict:
        try:
            search_query["icpsr"] = int(query_dict["icpsr"])
        except Exception:
            try:
                if query_dict["icpsr"][0] == "M":
                    for result in db.voteview_members.find(
                            {'id': query_dict["icpsr"]}, {'icpsr': 1, '_id': 0}
                    ):
                        search_query["icpsr"] = result["icpsr"]
                        break
            except Exception:
                return {}, {"errormessage": "Invalid ICPSR number supplied."}

    if "id" in query_dict:
        try:
            if query_dict["id"].upper()[0:2] in ["MH", "MS"]:
                search_query["id"] = query_dict["id"]
            else:
                return {}, {"errormessage": "Invalid ID supplied1."}
        except Exception:
            return {}, {"errormessage": "Invalid ID supplied2."}

    if "state_abbrev" in query_dict:
        state = str(query_dict["state_abbrev"])
        if len(state) == 2 or state.upper() == "USA":
            # States are all stored upper-case
            search_query["state_abbrev"] = state.upper()
        else:
            search_query["state_abbrev"] = state_name_to_abbrev(state.upper())

    if "biography" in query_dict:
        search_query["biography"] = {"$regex": query_dict["biography"],
                                     "$options": "i"}

    if "congress" in query_dict:
        try:
            # Congress is a number
            if isinstance(query_dict["congress"], int):
                search_query["congress"] = query_dict["congress"]
            # Congress is text, but in the form of a number
            elif " " not in query_dict["congress"]:
                search_query["congress"] = int(query_dict["congress"])
            # Congress is a range.
            elif all(x in query_dict["congresss"] for x in ["[", "]", "to"]):
                value_text = query_dict["congress"][1:-1]
                min_cong, max_cong = value_text.split(" to ")
                search_query["congress"] = {}
                if min_cong:
                    search_query["congress"]["$gte"] = int(min_cong)
                if max_cong:
                    search_query["congress"]["$lte"] = int(max_cong)
            # Congress is a series of spaced integers.
            else:
                vals = [int(val) for val in query_dict["congress"].split(" ")]
                search_query["congress"] = {}
                search_query["congress"]["$in"] = vals
        except Exception:
            return {}, {"errormessage": "Invalid congress ID supplied."}

    if "name" in query_dict:
        # Last, First needs to be reordered.
        if ", " in query_dict["name"]:
            last, rest = query_dict["name"].split(", ", 1)
            search_query["$text"] = {"$search": "%s %s" % (rest, last)}
        else:
            search_query["$text"] = {"$search": query_dict["name"]}

    if "speaker" in query_dict:
        search_query["served_as_speaker"] = 1

    if "freshman" in query_dict:
        search_query["congresses.0.0"] = config["max_congress"]

    if "party_code" in query_dict:
        if isinstance(query_dict["party_code"], dict):
            search_query["party_code"] = query_dict["party_code"]
        else:
            search_query["party_code"] = int(query_dict["party_code"])

    if "bioguide_id" in query_dict:
        search_query["bioguide_id"] = query_dict["bioguide_id"]

    if all(x in query_dict for x in ["district_code", "state_abbrev"]):
        search_query["district_code"] = query_dict["district_code"]

    if "chamber" in query_dict:
        chamber = query_dict["chamber"].capitalize()
        if chamber in ["Senate", "House", "President"]:
            search_query["chamber"] = chamber
        else:
            return {}, {"errormessage":
                "Invalid chamber provided. Please select House or Senate."} # noqa

    return search_query, {}


def augment_member_responses(sorted_res, api, max_results, distinct):
    """ Returns a constructed version of the member responses to a query. """
    seen_icpsr = []
    results = []
    member_count = 0

    for member in sorted_res:
        # First, is this a duplicate member?
        if member["icpsr"] in seen_icpsr and distinct:
            continue

        seen_icpsr.append(member["icpsr"])

        # Make a copy of the row for augmentation
        augment_m = member
        if "state_abbrev" in augment_m:
            augment_m["state"] = get_state_name(augment_m["state_abbrev"])
        if api == "exportORD":
            augment_m["state_icpsr"] = state_icpsr(augment_m["state_abbrev"])
        if all([x in augment_m for x in ["district_code", "state_abbrev"]]):
            augment_m["cqlabel"] = cqlabel(augment_m["state_abbrev"],
                                           augment_m["district_code"])
        if "party_code" in augment_m:
            augment_m["party_name"] = party_name(augment_m["party_code"])
        if api not in ["exportORD", "exportCSV", "R"]:
            augment_m["party_noun"] = party_noun(augment_m["party_code"])
            augment_m["party_color"] = party_color(augment_m["party_code"])
            augment_m["party_short_name"] = short_name(augment_m["party_code"])

        # Check if an image exists.
        if os.path.isfile("/var/www/voteview/static/img/bios/%s.jpg" %
                          str(augment_m["icpsr"]).zfill(6)):
            augment_m["bioImgURL"] = str(augment_m["icpsr"]).zfill(6) + ".jpg"
        else:
            augment_m["bioImgURL"] = "silhouette.png"

        # Ensure backwards compatibility of export files and safe encoding.
        if api in ["exportCSV", "exportORD"]:
            if 'bioname' in augment_m:
                augment_m['bioname'] = augment_m['bioname'].encode('utf-8')
            if "nominate" in augment_m:
                for key, value in augment_m["nominate"].items():
                    if key == 'log_likelihood':
                        augment_m[key] = round(value, 5)
                    else:
                        augment_m[key] = round(value, 3)
            del augment_m["nominate"]

        try:
            augment_m["seo_name"] = slugify(augment_m["bioname"])
        except Exception:
            pass

        results.append(augment_m)
        member_count += 1
        if member_count >= max_results:
            break

    return results


def member_lookup(query_dict, max_results=50, distinct=0, api="Web"):
    """ Handles the entire dispatch and response for a member query. """
    if api == "R":
        max_results = 5000

    # First, build the search query.
    search_query, errors = get_search_query(query_dict, api)
    if errors:
        return errors

    # Now, what fields do we need to get back?
    field_set = get_field_set(api, search_query)

    # We now send a query and see if it would get us any responses:
    res = db.voteview_members.find(search_query, field_set)
    first_count = res.count()

    # One possibility: No results from a Mongo name search, let's try a regex.
    if "$text" in search_query and not first_count:
        del search_query["$text"]
        search_query["bioname"] = {'$regex': query_dict["name"],
                                   '$options': 'i'}
        res = db.voteview_members.find(search_query, field_set)

    # If there's a text mongo search, sort by Mongo score.
    if "$text" in search_query:
        sorted_res = res.sort([('score', {'$meta': 'textScore'}),
                               ('icpsr', -1),
                               ('congress', -1)])
    # If it's an ORD file, sort in this specific order and confirm an index.
    elif api == "exportORD":
        db.voteview_members.ensure_index(
            [('state_abbrev', 1), ('district_code', 1), ('icpsr', 1)],
            name="ordIndex")
        sorted_res = res.sort(
            [('state_abbrev', 1), ('district_code', 1), ('icpsr', 1)])
    else:
        sorted_res = res.sort('congress', -1)

    # Confirm we have a reasonable number of results to return.
    if sorted_res.count() > 1000 and api not in ["R", "Web_Party"]:
        return {"errormessage": "Too many results found."}
    elif sorted_res.count() > 5000 and api != "Web_Party":
        return {"errormessage": "Too many results found."}

    response = augment_member_responses(sorted_res, api, max_results, distinct)

    if not response:
        return {
            'errormessage': 'No members found matching your search query.',
            'query': query_dict}

    # For regular searches get mad if we have more than max results.
    if len(response) > max_results and max_results > 1:
        return {
            "results": response,
            "errormessage": "Capping number of responses at %s." % max_results
        }

    return {'results': response}


def get_members_by_congress(congress, chamber, api="Web"):
    """ Lookup all members in the current congress. """
    if not chamber:
        return member_lookup(
            {"congress": congress},
            max_results=600,
            distinct=0,
            api=api)
    elif chamber and congress:
        return member_lookup(
            {"congress": congress, "chamber": chamber},
            max_results=600,
            distinct=0,
            api=api)

    return {'errormessage': 'You must provide a chamber or congress.'}


def get_members_by_party(party_id, congress, api="Web"):
    """ Lookup all members in the current party (and maybe congress). """
    if party_id and congress:
        return member_lookup(
            {"party_code": party_id,
             "congress": congress},
            max_results=500,
            distinct=1,
            api=api)
    elif party_id:
        return member_lookup(
            {"party_code": party_id},
            max_results=500,
            distinct=1,
            api=api)

    return {'errormessage': 'You must provide a party ID.'}


def nickname_helper(text, ref=""):
    """ Helping to fix a member's name to deal with nicknames. """
    ref_names = ref.split() if ref else []
    name = ""
    text = text.replace(",", "")
    for word in text.split():
        if word in ref_names:
            name = name + word + " "
        else:
            name = name + single_nickname_sub(word) + " "

    name = name.strip()
    return name


def single_nickname_sub(name):
    """ Try to find a single word nickname replacement for a name. """
    done = 0
    steps = 0
    while not done and steps < 20:
        candidates = []
        candidates = (candidates +
                      [x["nickname"] for x in config["nicknames"]
                       if x["name"].lower() == name.lower()])
        candidates = (candidates +
                      [x["name"] for x in config["nicknames"]
                       if x["nickname"].lower() == name.lower()])
        if candidates:
            candidates.append(name)
            candidates = sorted(list(set(candidates)),
                                key=lambda x: (len(x), x))
            new_name = candidates[0]
            if new_name != name:
                name = new_name
                steps = steps + 1
            else:
                done = 1
        done = 1
    return name


def get_members_by_private(query):
    """
    Use the private district lookup API to get members by a special query.
    """
    id_in = []
    for row in db.voteview_members.find(query, {"id": 1, "_id": 0}):
        id_in.append(row["id"])

    return member_lookup({"id_in": id_in},
                         max_results=200,
                         distinct=0,
                         api="districtLookup")


def district_member_lookups(results):
    """ Map a district set to a member set. """
    or_q = []
    at_large_set = []
    state_abbrev = ""
    state_abbrev_cong = 0
    for res in results["results"]:
        if not state_abbrev or (state_abbrev != res[0] and
                                res[1] > state_abbrev_cong):
            state_abbrev = res[0]
            state_abbrev_cong = res[1]
        if res[2]:
            or_q.append({"state_abbrev": res[0],
                         "district_code": res[2],
                         "congress": res[1]})
        else:
            at_large_set.append(res[1])

    if at_large_set:
        for c_id in at_large_set:
            match_district = len([x for x in or_q if x["congress"] == c_id])
            if not match_district:
                for dist_code in [1, 98, 99]:
                    or_q.append({"state_abbrev": state_abbrev,
                                 "district_code": dist_code,
                                 "congress": c_id})

    results_members = get_members_by_private({"chamber": "House", "$or": or_q})
    if "results" not in results_members:
        return {"status": 1, "error_message": "No matches."}

    current_cong = 0
    is_dc = results.get("is_dc", 0)
    if not is_dc:
        current_cong = next((x["district_code"] for x in
                             results_members["results"] if
                             x["congress"] == config["max_congress"]),
                            None)

    priv_query = {"$or": [{"chamber": "Senate",
                           "state_abbrev": state_abbrev,
                           "congress": config["max_congress"]},
                          {"chamber": "House",
                           "district_code": current_cong,
                           "state_abbrev": state_abbrev,
                           "congress": config["max_congress"]}]}
    current_lookup = get_members_by_private(priv_query)

    if not is_dc and "results" in current_lookup:
        return {"status": 0, "results": results_members["results"],
                "currentCong": current_cong,
                "resCurr": current_lookup["results"]}
    elif current_cong:
        return {"status": 0, "results": results_members["results"],
                "currentCong": current_cong, "resCurr": []}

    return {"status": 0, "results": results_members["results"],
            "currentCong": 0, "resCurr": []}


if __name__ == "__main__":
    member_lookup({"icpsr": 99912}, max_results=30)
