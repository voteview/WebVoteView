""" Helpers to download votes from web. """

from __future__ import print_function
from builtins import range
import copy
import time
import os
import math
import pymongo
from model.config import config
from model.search_members import cqlabel
from model.search_parties import party_name, short_name
from model.search_meta import meta_lookup
from model.slugify import slugify

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]
dim_weight = meta_lookup()['nominate']['second_dim_weight']


def waterfall_question(rollcall):
    """ Returns best form of the question available. """
    waterfall = ["vote_question", "question"]
    return next((rollcall[w] for w in waterfall if w in rollcall), None)


def waterfall_text(rollcall):
    """ Returns best form of the bill text available. """

    waterfall = ["vote_description", "vote_desc", "vote_document_text",
                 "vote_title", "vote_question_text", "amendment_author",
                 "dtl_desc", "description", "short_description"]

    return next((rollcall[w] for w in waterfall if w in rollcall),
                "Vote %s" % rollcall["id"])


def add_endpoints(mid, spread):
    """Add attributes to nomimate attribute that aid in
    drawing cutting lines
    """

    if (spread[0] == 0 and
            float(spread[1]) == 0 and
            float(mid[0]) == 0 and
            float(mid[1]) == 0):
        x = [0, 0]
        y = [0, 0]
        slope = None
        intercept = None
    elif abs(float(spread[1])) < 1e-16:
        x = [float(mid[0]), float(mid[0])]
        y = [-10, 10]
        slope = 1000
        intercept = -slope * (float(mid[0]) + float(mid[1]))
    else:
        slope = (-float(spread[0]) /
                 (float(spread[1]) * dim_weight * dim_weight))
        intercept = -slope * float(mid[0]) + float(mid[1])
        x = [10, -10]
        y = [intercept + slope * xx for xx in x]

    return slope, intercept, x, y


def _get_yeanayabs(vote_id):
    """
    Map vote ids with the proper values
    Yea -> [1..3], Nay -> [4..6], Abs -> [7..9]
    """
    if vote_id < 4:
        return "Yea"
    elif vote_id < 7:
        return "Nay"
    elif vote_id < 10:
        return "Abs"
    return "Err"


def _get_pairedvote(vote_id):
    """
    Map vote ids to a 0/1 flag if paired.
    """
    return 1 if vote_id in [2, 5] else 0


def process_voter_web(new_v, member_map):
    """ Augment a single voter for a web-based API. """

    # Map cast code to text.
    new_v["vote"] = _get_yeanayabs(new_v["cast_code"])
    new_v["paired_flag"] = _get_pairedvote(new_v["cast_code"])
    # We are not returning cast code.
    del new_v["cast_code"]

    # Copy the NOMINATE data if possible.
    try:
        new_v["x"] = member_map["nominate"]["dim1"]
    except Exception:
        pass
    try:
        new_v["y"] = member_map["nominate"]["dim2"]
    except Exception:
        pass

    # Process vote probability.
    if "prob" in new_v:
        try:
            new_v["prob"] = int(round(new_v["prob"]))
        except Exception:
            new_v["prob"] = 0

    # Fix the voter's name.
    new_v["name"] = member_map["bioname"]
    try:
        new_v["seo_name"] = slugify(new_v["name"])
    except Exception:
        pass

    # Fix the voter's party data
    new_v["party"] = party_name(member_map["party_code"])
    new_v["party_short_name"] = short_name(member_map["party_code"])
    new_v["party_code"] = member_map["party_code"]

    # Fix the member's bio image.
    if os.path.isfile("/var/www/voteview/static/img/bios/%s.jpg" %
                      str(member_map["icpsr"]).zfill(6)):
        new_v["img"] = str(member_map["icpsr"]).zfill(6) + ".jpg"
    else:
        new_v["img"] = "silhouette.png"

    # Fix the member's state data
    new_v["state_abbrev"] = member_map["state_abbrev"]
    if member_map["state_abbrev"] == "USA":
        new_v["district"] = "POTUS"
    elif member_map["district_code"] > 70:
        new_v["district"] = "%s00" % member_map["state_abbrev"]
    elif member_map["district_code"]:
        new_v["district"] = "%s%02d" % (member_map["state_abbrev"],
                                        member_map["district_code"])
    else:
        new_v["district"] = ""

    return new_v


def process_voter_export(new_v, member_map):
    """ Augments a single voter for R/Excel export. """
    try:
        del new_v["prob"]
    except Exception:
        pass

    if "nominate" in member_map and "dim1" in member_map["nominate"]:
        new_v["dim1"] = member_map["nominate"]["dim1"]
        new_v["dim2"] = member_map["nominate"]["dim2"]
    new_v["id"] = member_map["id"]
    new_v["name"] = member_map["bioname"]
    new_v["party_code"] = member_map["party_code"]
    new_v["state_abbrev"] = member_map["state_abbrev"]
    new_v["cqlabel"] = cqlabel(member_map["state_abbrev"],
                               member_map["district_code"])
    new_v['district_code'] = member_map['district_code']

    return new_v


def process_voters(rollcall, member_set, apitype, people_ids):
    """ Returns the augmented list of voters from the rollcall. """
    result = []
    meta_members = [m for m in member_set if
                    m["congress"] == rollcall["congress"]]

    for voter in rollcall["votes"]:
        # We're looking for people IDs -- is this voter one of them? If not,
        # keep on going, bub.
        if voter["icpsr"] not in people_ids:
            continue

        # Do the match from the member list from meta_members. If there's no
        # match, keep on going.
        try:
            member_map = next((m for m in meta_members if
                               m["icpsr"] == voter["icpsr"]), None)
            if not member_map:
                continue
        except Exception:
            continue

        new_voter = copy.deepcopy(voter)

        # Now assemble the matching.
        if apitype in ["Web", "Web_Person", "exportJSON"]:
            new_voter = process_voter_web(new_voter, member_map)

        # And for the R API
        elif apitype == "R" or apitype == "exportXLS":
            new_voter = process_voter_export(new_voter, member_map)

        # Append the new voter to the list of voters.
        result.append(new_voter)

    return result


def augment_pivots(rollcall, voter_list):
    """ Identify the pivotal voters in a given voter list. """
    # Let's identify the median(s).
    pivot_set = [x for x in voter_list if "x" in x and x["x"]]
    pivot_set = sorted(pivot_set, key=lambda x: x["x"])
    if len(pivot_set) % 2:
        pivot_index = int(math.ceil(len(pivot_set) / 2)) - 1
        median = [pivot_set[pivot_index]["icpsr"]]
    else:
        pivot_index = (len(pivot_set) / 2) - 1
        median = [pivot_set[pivot_index]["icpsr"],
                  pivot_set[pivot_index + 1]["icpsr"]]

    # Filibuster pivot
    fb_pivot = []
    if rollcall["chamber"] == "Senate" and rollcall["congress"] >= 94:
        pivot_index = math.ceil(len(pivot_set) * 2 / 3)
        fb_pivot = [pivot_set[pivot_index]["icpsr"],
                    pivot_set[len(pivot_set) - pivot_index]["icpsr"]]

    # Veto Override pivot
    number_voting = len([x for x in voter_list if
                         "vote" in x and x["vote"] != "Abs"])

    vp_index = int(math.ceil(float(number_voting) * float(2) / float(3)))
    veto_pivot = [pivot_set[vp_index]["icpsr"],
                  pivot_set[len(pivot_set) - vp_index - 1]["icpsr"]]

    for i in range(len(voter_list)):
        if voter_list[i]["icpsr"] in median:
            voter_list[i]["flags"] = "median"
        if voter_list[i]["icpsr"] in fb_pivot:
            voter_list[i]["flags"] = "fbPivot"
        if voter_list[i]["icpsr"] in veto_pivot:
            voter_list[i]["flags"] = "voPivot"

    return voter_list


def augment_nominate(rollcall):
    """ Augments a rollcall to add NOMINATE metadata. """

    if "nominate" not in rollcall:
        rollcall["nominate"] = {}
        return rollcall

    if "nominate" in rollcall and "slope" in rollcall["nominate"]:
        del rollcall["nominate"]["slope"]
    if "nominate" in rollcall and "intercept" in rollcall["nominate"]:
        del rollcall["nominate"]["intercept"]
    if "nominate" in rollcall and "x" in rollcall["nominate"]:
        del rollcall["nominate"]["x"]
    if "nominate" in rollcall and "y" in rollcall["nominate"]:
        del rollcall["nominate"]["y"]

    # Generate other nominate fields
    if (all(x in rollcall for x in ["nominate", "mid", "spread"]) and
            rollcall["nominate"]["spread"][0] is not None):
        slope, intercept, x, y = add_endpoints(rollcall["nominate"]["mid"],
                                               rollcall["nominate"]["spread"])

        rollcall["nominate"]["slope"] = slope
        rollcall["nominate"]["intercept"] = intercept
        rollcall["nominate"]["x"] = x
        rollcall["nominate"]["y"] = y

    return rollcall


def augment_codes(rollcall):
    """ Return the code fields from a given rollcall for export APIs. """
    code_fields = {"Clausen1": "", "Issue1": "", "Issue2": "",
                   "Peltzman1": "", "Peltzman2": ""}

    if "codes" not in rollcall:
        return code_fields

    for key, value in rollcall["codes"].items():
        if len(value) == 1:
            code_fields[key + '1'] = value[0]
        else:
            code_fields[key + '1'] = value[0]
            code_fields[key + '2'] = value[1]

    return code_fields


def truncate_text(text, truncate_length):
    """ Smart truncation to approximate length with ellipsis """

    # Return it all if we can.
    if len(text) <= truncate_length:
        return text

    # If we have to trim, try to trim at a period and allow 1x leeway
    # to find one.
    base = text[0:truncate_length]
    rest = text[truncate_length:]
    if ". " in rest:
        cutoff = rest.index(". ")
        if cutoff < truncate_length:
            return base + rest[0:cutoff]

    # No period within our maximum tolerance
    if len(rest) > truncate_length:
        return base + rest[0:truncate_length] + "..."

    # It's longer than we'd like but we can return it all anyway.
    return base + rest


def process_vote(rollcall, member_set, apitype, people_ids, fields_needed):
    """ Processes a single vote to add data as necessary """

    # If we need some people, let's iterate through the voters and fill
    # them out
    if people_ids:
        voter_list = process_voters(rollcall, member_set, apitype, people_ids)

    # Sort by ideology, and then identify the median and pivots
    if apitype == "Web":
        voter_list = augment_pivots(rollcall, voter_list)

    # Top level nominate metadata
    # Debug code to delete nominate data so we can regenerate it.
    rollcall = augment_nominate(rollcall)

    # Ensure nominate fields exist for the web.
    if apitype in ["Web", "Web_Person", "exportJSON", "exportCSV"]:
        nominate = rollcall['nominate']
        check_nom = ['classified', 'pre', 'log_likelihood',
                     'geo_mean_probability']

        for field in check_nom:
            if field not in nominate:
                nominate[field] = ''

    # Flatten NOMINATE for the R package
    elif apitype == "R":
        if "nominate" in rollcall:
            nominate = {"mid1": rollcall["nominate"]["mid"][0],
                        "mid2": rollcall["nominate"]["mid"][1],
                        "spread1": rollcall["nominate"]["spread"][0],
                        "spread2": rollcall["nominate"]["spread"][1],
                        "nomslope": rollcall['nominate']['slope'],
                        'nomintercept': rollcall['nominate']['intercept']}
        else:
            nominate = {}

    # Get the best available description.
    description = waterfall_text(rollcall)
    # Truncate the description for the R API.
    if apitype in ["R", "exportCSV"]:
        description = truncate_text(description, 255)

    # Get the best available question
    question = waterfall_question(rollcall)

    if 'vote_result' not in rollcall:
        rollcall['vote_result'] = None

    # Collapse codes for R
    if apitype in ["exportCSV", "exportXLS"]:
        codes = augment_codes(rollcall)
    elif apitype in ["Web", "Web_Person", "exportJSON", "exportCSV"]:
        codes = rollcall["codes"] if "codes" in rollcall else {}
    elif apitype == "R":
        codes = ({key: "; ".join(value) for key, value in
                  rollcall["codes"].items()} if "codes" in rollcall else
                 {})

    # Pre-allocate keyvote flags.
    if "key_flags" not in rollcall:
        rollcall["key_flags"] = []

    # Output object -- copy all the required fields if needed.
    fields_needed = fields_needed + ["sponsor", "bill_number", "tie_breaker"]
    new_r = {key: rollcall[key] for key in fields_needed if key in rollcall}

    if apitype in ["exportCSV", "exportXLS"]:
        new_r.update({k: v for k, v in codes.items()})
        new_r.update(
            {'keyvote': ''.join(rollcall['key_flags']),
             'spread.dim1': nominate['spread'][0],
             'spread.dim2': nominate['spread'][1],
             'mid.dim1': nominate['mid'][0],
             'mid.dim2': nominate['mid'][1],
             'slope': nominate['slope'],
             'intercept': nominate['intercept'],
             'log_likelihood': round(nominate['log_likelihood'], 5),
             'classified': nominate['classified'],
             'pre': nominate['pre'],
             'question': None if not question else question.encode('utf-8'),
             'description': description.encode('utf-8'),
             'geo_mean_probability': (
                 None if nominate['geo_mean_probability'] == '' else
                 round(nominate['geo_mean_probability'], 3))})

    if apitype != "exportCSV":
        new_r.update(
            {'key_flags': rollcall["key_flags"],
             'votes': voter_list,
             'codes': codes,
             'nominate': nominate,
             'description': description,
             'question': question})

    # Get other people's results from the party results aggregate.
    if apitype == "Web_Person":
        new_r["party_vote_counts"] = rollcall["party_vote_counts"]

    return new_r


def download_votes_api(rollcall_ids, apitype="Web", voter_id=0):
    """ Main dispatcher to download a series of votes. """
    starttime = time.time()
    # Setup API version response
    if apitype in ["Web", "Web_Person", "exportJSON", "exportCSV"]:
        api_version = "Web 2019-10"
    elif apitype == "R":
        api_version = "R 2016-10"

    if not rollcall_ids:
        response = {'errormessage': 'No rollcall id specified.',
                    'apitype': api_version}
        return response

    # Split multiple ID requests into list
    if isinstance(rollcall_ids, list):
        pass
    elif "," in rollcall_ids:
        rollcall_ids = [x.strip() for x in rollcall_ids.split(",")]
    else:
        rollcall_ids = [rollcall_ids]

    # Abuse filter
    max_votes = 100
    if apitype in ["exportJSON", "exportCSV"]:
        max_votes = 500
    if len(rollcall_ids) > max_votes:
        response = {'errormessage': 'API abuse. Too many votes.',
                    'apitype': api_version}
        return response

    rollcall_results = []  # Stores top level rollcall results, one per vote
    errormessage = ""  # String storing error text
    errormeta = []  # List storing failed IDs

    # Pre-initialize to having not found the votes.
    found = {rid: 0 for rid in rollcall_ids}

    # Do we need to fold in members to our download?
    people_ids = []
    member_set = []

    # I need to fold in one specific member
    if apitype == "Web_Person":
        people_ids = [voter_id]
    # All relevant members
    elif apitype != "exportCSV":
        people_ids = db.voteview_rollcalls.distinct(
            "votes.icpsr", {"id": {"$in": rollcall_ids}})

    congresses = []
    for rollcall_id in rollcall_ids:
        try:
            congresses.append(int(rollcall_id[2:5]))
        except Exception:
            pass

    # Now fetch the members we need.
    if people_ids:
        member_fields = {"icpsr": 1, "nominate": 1, "bioname": 1,
                         "party_code": 1, "state_abbrev": 1, "chamber": 1,
                         "district_code": 1, "congress": 1, "id": 1}
        members = db.voteview_members.find(
            {"icpsr": {"$in": people_ids}, "congress": {"$in": congresses}},
            member_fields)
        for m in members:
            member_set.append(m)

    # Now iterate through the rollcalls
    fields_needed = [
        'party_vote_counts', 'vote_title',
        'vote_desc', 'key_flags', 'yea_count', 'sponsor',
        'bill_number', 'id', 'description', 'tie_breaker', 'votes',
        'codes', 'dtl_desc', 'question', 'vote_description',
        'short_description', 'nay_count', 'congress',
        'vote_question_text', 'rollnumber', 'date',
        'vote_document_text', 'nominate', 'amendment_author',
        'chamber', 'vote_result', 'shortdescription', 'vote_question',
        'tie_breaker', 'cg_summary', 'cg_official_titles',
        'cg_short_titles_for_portions', 'dtl_sources', 'congress_url',
        'clerk_rollnumber',
    ]
    rollcalls = (
        db.voteview_rollcalls
        .find(
            {'id': {'$in': rollcall_ids}},
            {field: 1 for field in fields_needed}
        )
        .sort('id')
        .batch_size(10)
    )

    for rollcall in rollcalls:
        try:
            augmented_vote = process_vote(rollcall, member_set,
                                          apitype, people_ids, fields_needed)
            rollcall_results.append(augmented_vote)
        # Invalid vote id
        except Exception:
            errormessage = "Invalid Rollcall ID specified."
            errormeta.append(str(rollcall["id"]))

    if rollcalls.count() != len(rollcall_ids):
        errormessage = "Invalid Rollcall ID specified."
        errormeta += [str(vote_id) for vote_id in found if not found[vote_id]]

    response = {}
    if rollcall_results:
        response["rollcalls"] = rollcall_results
    if errormessage:
        response["errormessage"] = errormessage
        if errormeta:
            response["errormeta"] = errormeta
    response["apitype"] = api_version
    response["elapsedTime"] = round(time.time() - starttime, 3)
    return response


def download_stash(stash_id):
    """ Downloads all votes in a stash. """
    if not stash_id:
        return {"errormessage": "Invalid stash id.", "rollcalls": []}

    res = db.stash.find_one({"id": id})
    if not res:
        return {"errormessage": "Invalid stash id.", "rollcalls": []}

    vote_ids = []
    if "old" in res:
        vote_ids = vote_ids + res["old"]
    if "votes" in res:
        vote_ids = list(set(vote_ids + res["votes"]))

    return download_votes_api(vote_ids, apitype="exportJSON")


if __name__ == "__main__":
    # print download_votes_api("RS1140430")
    # print "=====Start 2"
    # print download_votes_api("RH1030301", "R")
    # print "=====Start 3"
    # print download_votes_api("RS0090027", "Web_Person", "09366")
    # print "=====Start 4"
    # print download_votes_api("RS1140473", "Web_Person",
    # "09366")["rollcalls"][0]["nominate"]
    print("=====Start 5")
    print(download_votes_api(["RH0930002"], "Web"))
    # print download_votes_api(["RH0800005", "RH1140005",
    #                          "RH0310005", "RS0990005"], "R")
