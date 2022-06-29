""" The helper functions associated with dispatching the main index search. """

from builtins import range
import os
from fuzzywuzzy import fuzz
from model.search_votes import query
from model.search_members import member_lookup, nickname_helper
from model.bio_data import congress_to_year
from model.search_parties import party_lookup
from model.slugify import slugify
from model.config import config


def default_value(value, overwrite=None):
    """ Quick ternary operator. """
    return value if value else overwrite


def current_congress():
    """ Returns the current congress. """
    return config["max_congress"]


def assemble_party_search(query_string):
    """ Dispatches a search to look up parties. """
    # First, if we can coerce the query into an integer, it might be
    # a party ID.
    try:
        q_integer = int(query_string)
        if q_integer > 0 and q_integer < 10000:
            party_search = party_lookup({"id": q_integer},
                                        api="Web_FP_Search")
        else:
            party_search = {}
    # If we can't coerce into an integer, it's probably a name.
    except Exception:
        party_search = party_lookup({"name": query_string},
                                    api="Web_FP_Search")

    if "results" not in party_search:
        return []

    # Scoring party results.
    result_parties = []
    for party in party_search["results"]:
        # You get more points the closer you are to the search query.
        party["scoreMatch"] = fuzz.token_set_ratio(
            party["fullName"].lower().replace(" party", ""),
            query_string.lower().replace(" party", ""))

        # Larger parties get more points.
        if party["count"] > 1000:
            party["scoreMatch"] += 25
        elif party["count"] > 100:
            party["scoreMatch"] += 10

        # Get a slugged version of the name for the link.
        party["seo_name"] = slugify(party["fullName"])
        party["min_year"] = congress_to_year(party["minCongress"], 0)
        party["max_year"] = congress_to_year(party["maxCongress"], 1)

        # Append to results.
        result_parties.append(party)

    result_parties.sort(key=lambda x: (-x["scoreMatch"], -x["maxCongress"]))
    return result_parties


def match_state_delegation(query_string, state_meta, time_periods):
    """ The query is a state delegation -- but which one? """

    qstrip = query_string.strip().lower()
    flags = {}

    # A priori assume that any query that hits here is a members-only
    # query unless it's the exact state name.

    # Which chamber do we think they're asking for?
    chamber_find = "Senate" if "senat" in qstrip else "House"

    # Which state do we think they're asking for?
    state = next((s for s in state_meta["full_state_name"] if
                  s.lower() in qstrip), None)
    state_name = state_meta["state_map"][state] if state else ""

    if not state_name:
        state = next((s for s in state_meta["abbrev_state_name"] if
                      s.lower() == qstrip), None) # noqa
        state_name = state if state else ""
    # Which congress do we think they're asking for?
    congress = 0
    if "current" in qstrip:
        congress = current_congress()
    else:
        for time_period in time_periods:
            if time_period in qstrip:
                flags["show_rollcalls"] = 0
                numeral = 0
                for numeral_time in time_period.split(" "):
                    numeral = (numeral_time.replace("th", "")
                               .replace("nd", "")
                               .replace("rd", ""))
                    if numeral.isdigit():
                        numeral = int(numeral)
                        break
                if numeral:
                    congress = numeral
                    break
    if not congress:
        congress = current_congress()

    if chamber_find and state_name and congress:
        member_search = member_lookup({"state_abbrev": state_name,
                                       "congress": congress,
                                       "chamber": chamber_find}, 100,
                                      distinct=1, api="Web_FP_Search")
        # Switch 1 to 0 or vice versa
        flags = {
            "show_rollcalls": 1,
            "need_score": 0,
            "expand_results": 1
        }
    elif state_name and congress:
        member_search = member_lookup({"state_abbrev": state_name,
                                       "congress": congress}, 100,
                                      distinct=1, api="Web_FP_Search")
        # Switch 1 to 0 or vice versa
        flags = {
            "show_rollcalls": 1,
            "need_score": 0,
            "expand_results": 1
        }
    print(member_search)
    
    return member_search, flags


def build_manual_state_queries():
    """ Builds the manual queries used by plain English searches. """
    # Building state delegation queries
    jobs = ["representatives", "reps", "senators", "members", "senate",
            "house", "house delegation", "senate delegation", "congressmen",
            "congresspersons", "congressional delegation",
            "congress delegation", "delegation"]
    prepositions = ["of", "in", "from"]
    state_map = {}
    abbrev_state_name = []
    full_state_name = []
    state_queries = []

    # Load the abbreviations into the full state map.
    for state_label in config["states"]:
        abbrev_state_name.append(state_label["state_abbrev"])
        full_state_name.append(state_label["name"])
        state_map[state_label["name"]] = state_label["state_abbrev"]
        # First, add to the query list the exact names of states/abbrevs --
        # we exclude Washington because of how much more likely it is that
        # the respondent meant George Washington.
        if state_label["name"].lower() != "washington":
            state_queries.append(state_label["name"].lower())

        for job in jobs:
            for preposition in prepositions:
                # Then both current-prefixed and non-current prefixed versions
                # of each combination for names and abbrevs.
                state_queries.append("current %s %s %s" %
                                     (job, preposition,
                                      state_label["state_abbrev"].lower()))
                state_queries.append("current %s %s %s" %
                                     (job, preposition,
                                      state_label["name"].lower()))
                state_queries.append("%s %s %s" %
                                     (job, preposition,
                                      state_label["state_abbrev"].lower()))
                state_queries.append("%s %s %s" %
                                     (job, preposition,
                                      state_label["name"].lower()))

    # De-duplicate this list if any duplicates exist.
    state_queries = list(set(state_queries))
    return {
        "state_queries": state_queries,
        "state_map": state_map,
        "full_state_name": full_state_name,
        "abbrev_state_name": abbrev_state_name
    }


def assemble_fancy_member_search(query_string, state_meta, time_periods):
    """ Attempts to use the manual override English search engine. """
    # Search overrides for custom search use cases.

    qstrip = query_string.strip().lower()
    flags = {"show_rollcalls": 1}

    # Vote by known ID
    if (len(query_string.split()) == 1 and
            (query_string.upper().startswith("MH") or
             query_string.upper().startswith("MS"))):
        member_search = member_lookup({"id": query_string}, 8,
                                      distinct=1, api="Web_FP_Search")

    # List all speakers
    elif qstrip in ["speaker of the house", "speakers of the house",
                    "speaker: 1", "speaker:1", "house speaker"]:
        member_search = member_lookup({"speaker": 1, "chamber": "house"}, 60,
                                      distinct=1, api="Web_FP_Search")
        flags["need_score"] = 0
        flags["expand_results"] = 1

    # List all presidents
    elif qstrip in ["potus", "president of the united states",
                    "president", "the president", "president:1",
                    "president: 1", "presidents",
                    "presidents of the united states",
                    "presidents of the united states of america",
                    "president of the united states of america"]:
        member_search = member_lookup({"chamber": "President"}, 50,
                                      distinct=1, api="Web_FP_Search")
        flags["need_score"] = 0
        flags["expand_results"] = 1

    # List all freshmen
    elif qstrip in ["freshmen", "freshman", "new hires",
                    "first-years", "just elected", "tenderfoot",
                    "newly elected"]:
        member_search = member_lookup({"freshman": 1}, 75,
                                      distinct=1, api="Web_FP_Search")
        flags["need_score"] = 0
        flags["expand_results"] = 1
    
    # List state delegation
    elif ([s for s in state_meta["state_queries"] if s in qstrip] or
          [s for s in state_meta["abbrev_state_name"] if s.lower() == qstrip]):
        member_search, flags = (
            match_state_delegation(query_string, state_meta, time_periods))

    # ICPSR of user
    elif (len(query_string.split()) == 1 and str.isdecimal() and
          int(query_string)):
        member_search = member_lookup({"icpsr": int(query_string)}, 5,
                                      distinct=1, api="Web_FP_Search")
        flags["redirect_flag"] = 1

    # Okay, probably a normal search then.
    elif len(query_string.split()) <= 5:
        member_search = member_lookup({"name": query_string}, 200,
                                      distinct=1, api="Web_FP_Search")
        flags["need_score"] = 1

    return member_search, flags


def bonus_score_member(member, query_string):
    """ Calculate bonus points for member search results. """

    bonus_match = 0

    # Exact last name bonus
    try:
        if (len(query_string.split()) == 1 and "," in member["bioname"] and
                query_string.lower().strip() ==
                member["bioname"].lower().split(",")[0]):
            bonus_match += 25

    except Exception:
        pass

    # Recency bonus
    if member["congress"] >= config["max_congress"] - 2:
        bonus_match += 15
    elif member["congress"] >= config["max_congress"] - 15:
        bonus_match += 10
    elif member["congress"] >= config["max_congress"] - 65:
        bonus_match += 5

    # Chamber bonus
    bonus_match += 75 if member["chamber"] == "President" else 0
    bonus_match += 15 if member["chamber"] == "Senate" else 0

    # Duration of service bonus
    if "congresses" in member:
        duration = sum((cong[1] - cong[0] for cong in member["congresses"]))
        if duration >= 5:
            bonus_match += 12

    return bonus_match


def process_found_members(member_search, query_string, flags):
    """ Augments, sorts, and combines found members from search. """

    # Keep track of who we have seen.
    result_members = []
    seen_bioguide_ids = []
    for member in member_search["results"]:
        if "bioguide_id" in member:
            if member["bioguide_id"] in seen_bioguide_ids:
                continue
            seen_bioguide_ids.append(member["bioguide_id"])

        member_name = (member["bioname"]
                       if "bioname" in member and member["bioname"]
                       else "Error Invalid Name.").replace(",", "").lower()
        query_lower = query_string.replace(",", "").lower()

        # How close does the name match to the name we search for?
        score_basic = fuzz.token_set_ratio(member_name, query_lower)
        score_nickname = fuzz.token_set_ratio(
            nickname_helper(member_name, query_lower),
            nickname_helper(query_lower))
        member["scoreMatch"] = max(score_basic, score_nickname)
        member["bonusMatch"] = bonus_score_member(member, query_string)

        # Fill out the member's bio image:
        member["bio_image"] = ("silhouette.png" if not
                               os.path.isfile("static/img/bios/%s.jpg" %
                                              str(member["icpsr"]).zfill(6))
                               else "%s.jpg" % str(member["icpsr"]).zfill(6))

        # Fill out their first elected time and their SEO-friendly link name.
        member["min_elected"] = congress_to_year(member["congresses"][0][0], 0)
        member["seo_name"] = slugify(member["bioname"])

        # Fill out their name in the proper order, and fixing parenthetical
        # middle / nicknames
        if ("bioname" in member and len(member["bioname"]) > 20 and
                "(" in member["bioname"]):
            member["bioname"] = ("%s, %s" % (
                                 member["bioname"].split(",")[0],
                                 member["bioname"].split("(")[1].split(")")[0])
                                 )

        # Fix their state.
        member["state"] = member["state"].replace("(", "").replace(")", "")

        result_members.append(member)

    if "need_score" in flags and flags["need_score"]:
        if result_members and result_members[0]["scoreMatch"] >= 100:
            result_members = [x for x in result_members
                              if x["scoreMatch"] >= 100]
        result_members.sort(key=lambda x: -(x["scoreMatch"] + x["bonusMatch"]))
    else:
        result_members.sort(key=lambda x: -x["congress"])

    count_members = len(result_members)
    if count_members > 200:
        count_members = "200+"
    if (len(result_members) > 8 and
            ("expand_results" not in flags or not flags["expand_results"])):
        result_members = result_members[0:8]

    return result_members, count_members


def assemble_member_search(query_string, next_id):
    """ Dispatches a search query to members databases. """

    result_members = []
    flags = {
        "need_score": 1,
        "redirect_flag": 0,
        "expand_results": 0,
        "show_rollcalls": 1
    }
    count_members = 0
    member_search = {}

    # Initialize the "manual query override" -- plain English search queries
    # that should return some members.
    state_meta = build_manual_state_queries()

    # Time period capture:
    def ordinal_suffix(n):
        """ Quick ordinal suffix helper. """
        suffix_text = "tsnrhtdd"
        suffix = suffix_text[(n / 10 % 10 != 1) * (n % 10 < 4) * n % 10::4]
        return "%d%s" % (n, suffix)

    time_periods = []
    for cong_session in range(current_congress(), 0, -1):
        time_periods.append(str(cong_session) + " congress")
        time_periods.append("congress " + str(cong_session))
        time_periods.append(ordinal_suffix(cong_session) + " congress")
        time_periods.append("congress: " + str(cong_session))

    if query_string and not next_id and ":" not in query_string:
        try:
            member_search, flags = assemble_fancy_member_search(
                query_string, state_meta, time_periods)
        except Exception:
            member_search = member_lookup({"name": query_string},
                                          200,
                                          distinct=1,
                                          api="Web_FP_Search")

    # Biography search
    if (query_string and len(query_string.split()) > 1 and
            query_string.lower().split()[0] == "biography:"):
        bio_search = " ".join(query_string.strip().lower().split()[1:])
        member_search = member_lookup({"biography": bio_search},
                                      50,
                                      distinct=1,
                                      api="Web_FP_Search")
        flags["show_rollcalls"] = 0
        flags["expand_results"] = 0

    if "results" in member_search:
        result_members, count_members = process_found_members(member_search,
                                                              query_string,
                                                              flags)

    return result_members, count_members, flags


def facet_congress(query_string, bottle):
    """ Builds the congress facet for the query dispatcher. """
    try:
        from_cong = int(
            default_value(bottle.request.params["fromCongress"], 0)
        )
        to_cong = int(default_value(bottle.request.params["toCongress"], 0))
        if not query_string and (from_cong or to_cong):
            query_string = ""

        if from_cong or to_cong:
            if from_cong == to_cong:
                query_string += " congress:%s" % str(from_cong)
            elif from_cong and not to_cong:
                query_string += " congress:[%s to ]" % str(from_cong)
            elif to_cong and not from_cong:
                query_string += " congress:[ to %s]" % str(to_cong)
            else:
                query_string += " congress:[%s to %s]" % (
                    str(from_cong), str(to_cong))
    except Exception:
        pass

    return query_string


def facet_support(query_string, bottle):
    """ Builds the support facet for the query dispatcher. """
    try:
        support = bottle.request.params["support"]
        if not query_string and support:
            query_string = ""

        # If there's a range, lets try to implement the range.
        if "," in support:
            try:
                val_min, val_max = [int(x) for x in support.split(",")]
                if val_min != 0 or val_max != 100:
                    query_string += " support:[%s to %s]" % (
                        str(val_min), str(val_max)
                    )
            except Exception:
                pass
        else:
            try:
                support = int(support)
                query_string += " support:[%s to %s]" % (
                    str(support - 1), str(support + 1)
                )
            except Exception:
                pass
    except Exception:
        pass

    return query_string


def facet_keyvote(query_string, bottle):
    """ Builds the keyvote facet for the query dispatcher. """

    try:
        keyvote = bottle.request.params.getall("keyvote")
        if keyvote:
            if not query_string:
                query_string = ""

            return query_string + " keyvote: 1"
    except Exception:
        pass

    return query_string


def facet_codes(query_string, bottle):
    """ Builds the Clausen/Peltzman code facets for the query dispatcher. """

    # Read the codes
    try:
        clausen = bottle.request.params.getall("clausen")
    except Exception:
        clausen = []

    try:
        peltzman = bottle.request.params.getall("peltzman")
    except Exception:
        peltzman = []

    # Build the query string.
    code_string = ""
    if clausen:
        code_string = " codes.Clausen: %s" % " OR ".join(clausen)
    if peltzman:
        code_string += " codes.Peltzman: %s" % " OR ".join(peltzman)

    return query_string if not code_string else query_string + code_string


def assemble_rollcall_search(query_string, next_id, bottle):
    """ Dispatches a search using the rollcall facets. """

    # Date facet
    startdate = default_value(bottle.request.params.fromDate)
    enddate = default_value(bottle.request.params.toDate)

    # Build the facets directly in the search
    query_string = facet_congress(query_string, bottle)
    query_string = facet_support(query_string, bottle)
    query_string = facet_keyvote(query_string, bottle)
    query_string = facet_codes(query_string, bottle)

    # Build the extra parameter facets
    try:
        chamber = bottle.request.params.getall("chamber")
        if len(chamber) > 1:
            chamber = None
        elif isinstance(chamber, list):
            chamber = chamber[0]
    except Exception:
        chamber = None

    # Sort facet
    sort_dir = int(default_value(bottle.request.params.sortD, -1))
    if sort_dir not in [-1, 1]:
        sort_dir = -1

    sort_score = int(default_value(bottle.request.params.sortScore, 1))
    icpsr = default_value(bottle.request.params.icpsr)
    jsapi = 1
    row_limit = 50
    res = query(query_string, startdate, enddate, chamber,
                icpsr=icpsr, row_limit=row_limit,
                jsapi=jsapi, sort_dir=sort_dir,
                sort_skip=next_id, sort_score=sort_score,
                request=bottle.request)
    return res


def assemble_search(query_string, next_id, bottle):
    """ The main dispatcher method. """

    # First, is the search query plausibly a party ID or party?
    if (query_string and not next_id and ":" not in query_string and
            len(query_string.split()) < 4):
        result_parties = assemble_party_search(query_string)
    else:
        result_parties = []

    # Now, is the search query plausible a member ID or member?
    result_members, count_members, flags = assemble_member_search(query_string,
                                                                  next_id)

    # If the member search told us we definitely do not need to do a rollcall
    # search, then let's not do a rollcall search. We can also discard the
    # party search results here.
    if "show_rollcalls" not in flags or not flags["show_rollcalls"]:
        bottle.response.headers["rollcall_number"] = 0
        bottle.response.headers["member_number"] = count_members
        bottle.response.headers["party_number"] = 0

        if len(result_members) > 50:
            result_members = result_members[:50]

        out = bottle.template("views/search_results",
                              rollcalls=[],
                              errormessage="",
                              result_members=result_members,
                              result_parties=[])
        return out

    # Okay, so if we need to rollcall search, let's do it.
    result_rollcalls = assemble_rollcall_search(query_string, next_id, bottle)

    # Now combine and give the user what they want.
    return combine_results(result_parties, result_members, result_rollcalls,
                           flags, bottle)


def combine_results(result_parties, result_members, result_rollcalls,
                    flags, bottle):
    """ Combines the results of all the searches. """

    if "errormessage" in result_rollcalls:
        bottle.response.headers["rollcall_number"] = -999
        bottle.response.headers["member_number"] = 0
        bottle.response.headers["nextId"] = 0

        remainder = 50
        # Only show a maximum of four parties, and only up to 50 parties +
        # members
        result_parties = result_parties[:min(4, len(result_parties))]
        remainder -= len(result_parties)
        result_members = result_members[:min(remainder, len(result_members))]

        return bottle.template(
            "views/search_results",
            rollcalls=[],
            errormessage=result_rollcalls["errormessage"],
            result_members=result_members,
            result_parties=result_parties
        )

    # Okay, then we're going to be showing some rollcalls. Let's get the
    # highlighting properly.
    highlighter = (result_rollcalls["fullTextSearch"]
                   if "fullTextSearch" in result_rollcalls else "")

    # If we got exactly one member result and nothing else, let's set up
    # a redirect.
    if ("redirect_flag" in flags and flags["redirect_flag"] and not
            result_parties and len(result_members) == 1 and
            ("rollcalls" not in result_rollcalls or not
             result_rollcalls["rollcalls"])):
        bottle.response.headers["redirect_url"] = "/person/%s/%s" % (
            str(result_members[0]["icpsr"]),
            result_members[0]["seo_name"])

    # Use headers to pass metadata about search results.
    bottle.response.headers["rollcall_number"] = (
        result_rollcalls["recordcountTotal"]
    )
    bottle.response.headers["member_number"] = len(result_members)
    bottle.response.headers["party_number"] = len(result_parties)
    bottle.response.headers["nextId"] = result_rollcalls["next_id"]
    bottle.response.headers["need_score"] = result_rollcalls["need_score"]

    # Either we return a no-rollcall search or
    if "rollcalls" not in result_rollcalls:
        return bottle.template("views/search_results",
                               rollcalls=[], errormessage="",
                               result_members=result_members,
                               result_parties=result_parties)

    # We return a search with rollcalls
    return bottle.template("views/search_results",
                           rollcalls=result_rollcalls["rollcalls"],
                           highlighter=highlighter,
                           errormessage="",
                           result_members=result_members,
                           result_parties=result_parties)
