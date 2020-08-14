""" Helpers that augment person responses with biographical data. """

from __future__ import print_function
from builtins import range
import os
from model.search_members import member_lookup
from model.loyalty import get_loyalty


def get_bio_image(icpsr, default):
    """ Check for file presence of bio image or fall back to default. """

    bio_image = "%s.jpg" % str(icpsr).zfill(6)
    bio_image = (bio_image if os.path.isfile("static/img/bios/%s" % bio_image)
                 else default)

    return bio_image, int(bio_image != default)


def get_years_of_service(person, chamber=""):
    """
    Takes a person and returns year ranges of service, overall or in a chamber.
    """
    congresses = []

    if chamber and chamber not in ["House", "Senate"]:
        return []

    if chamber:
        if "congresses_" + chamber.lower() in person:
            congresses = person["congresses_" + chamber.lower()]
    else:
        if "congresses" in person:
            congresses = person["congresses"]

    if not congresses:
        return []

    year_set = [[congress_to_year(congress[0], 0),
                 congress_to_year(congress[1], 1)] for congress in congresses]

    if (chamber and year_set and "voting_dates" in person and
            chamber in person["voting_dates"] and
            int(person["voting_dates"][chamber][1].split("-")[0])):
        year_set[-1][1] = max(
            year_set[-1][1],
            int(person["voting_dates"][chamber][1].split("-")[0]))

    return year_set


def congresses_of_service(icpsr, chamber=""):
    """ Get a member's congresses of service. """
    if not isinstance(icpsr, str) or len(icpsr) < 6:
        icpsr = str(int(icpsr)).zfill(6)

    terms = member_lookup({"icpsr": icpsr}, 30)

    # No match for user
    if "results" not in terms:
        return []

    # No chamber information
    if not chamber:
        if "congresses" in terms["results"][0]:
            return terms["results"][0]["congresses"]
    # House
    elif chamber == "House":
        if "congresses_house" in terms["results"][0]:
            return terms["results"][0]["congresses_house"]
    # Senate
    elif chamber == "Senate":
        if "congresses_senate" in terms["results"][0]:
            return terms["results"][0]["congresses_senate"]

    # Default case.
    return []


def years_of_service(icpsr, chamber=""):
    """ Get a member's years of services based on congresses of service. """
    congresses_set = congresses_of_service(icpsr, chamber)
    year_chunks = []
    for chunk in congresses_set:
        year_chunks.append([congress_to_year(chunk[0], 0),
                            congress_to_year(chunk[1], 1)])

    return year_chunks


def congress_to_year(congress, end_date):
    """ Quick convert congress number to year number. """
    return 1787 + (2 * congress) + (2 * end_date)


def check_for_party_switch(person):
    """
    Returns a list of other ICPSrs a person might have after party switches.
    """
    # First, sanity check that this person exists and the query is well-
    # specified
    if "icpsr" not in person or not person["icpsr"]:
        return {}

    if "bioguide_id" not in person:
        return {}

    person_query = {"bioguide_id": person["bioguide_id"]}
    lookup = member_lookup(person_query, 10, 1, "Check_Party_Switch")

    if "errormessage" in lookup:
        return {}

    other_icpsrs = [str(x["icpsr"]).zfill(6) for x in lookup["results"]
                    if x["icpsr"] != person["icpsr"]]
    return {"results": other_icpsrs}


def check_for_occupancy(person):  # pylint: disable=W0613
    """
    Deprecated stub function which is intended to check for seat occupancy.
    """
    return []


def levenshtein(subs1, subs2):
    """
    Levenshtein string distance of two strings. Source:
    https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#Python
    """

    if len(subs1) < len(subs2):
        return levenshtein(subs2, subs1)

    if not subs2:
        return len(subs1)

    previous_row = list(range(len(subs2) + 1))
    for i, chunk1 in enumerate(subs1):
        current_row = [i + 1]
        for j, chunk2 in enumerate(subs2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (chunk1 != chunk2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def generate_life_string(person):
    """
    Uses born and died fields to fill out (1955 - 1999) style strings of
    years lived.
    """

    if ("born" in person and "died" in person and
            person["born"] is not None and person["died"] is not None):
        return "(%s-%s)" % (str(person["born"]), str(person["died"]))
    elif (("born" in person and person["born"] is not None) and
          ("died" not in person or person["died"] is None) and
          person["born"] < 1900):
        return "(%s-??)" % str(person["born"])
    elif (("born" in person and person["born"] is not None) and
          ("died" not in person or person["died"] is None)):
        return "(%s-)" % str(person["born"])
    elif "died" in person and person["died"] is not None:
        return "(??-%s)" % str(person["died"])

    return ""


def assemble_person_meta(person, keith=0):
    """
    Augment a person result with relevant metadata, including
    bio image, years and congresses of service, party switch info, etc.
    """

    # Default name
    person["bioname"] = person.get("bioname",
                                   "ERROR NO NAME IN DATABASE PLEASE FIX.")

    # Check if bio image exists
    default = "silhouette.png" if not keith else "keith.png"
    person["bioImg"], _ = get_bio_image(person["icpsr"], default)

    # Get years of service
    person["yearsOfService"] = get_years_of_service(person, "")
    person["yearsOfServiceSenate"] = get_years_of_service(person, "Senate")
    person["yearsOfServiceHouse"] = get_years_of_service(person, "House")

    person["congressesOfService"] = person["congresses"]
    person["congressLabels"] = {}
    for congress_chunk in person["congressesOfService"]:
        for cong in range(congress_chunk[0], congress_chunk[1] + 1):
            person["congressLabels"][cong] = ("%sth Congress (%s-%s)" %
                                              (cong, congress_to_year(cong, 0),
                                               congress_to_year(cong, 1)))

    # Find out if we have any other ICPSRs that are this person for another
    # party
    alt_icpsrs = check_for_party_switch(person)
    if alt_icpsrs and "results" in alt_icpsrs:
        person["altPeople"] = []
        # Iterate through them
        for alt in alt_icpsrs["results"]:
            # Look up this one
            alt_person = member_lookup({"icpsr": alt}, 1)["results"][0]
            if "errormessage" in alt_person:
                continue

            # Get their years of service
            alt_person["yearsOfService"] = get_years_of_service(alt_person,
                                                                "")
            if alt_person["icpsr"] not in [x["icpsr"] for x in
                                           person["altPeople"]]:
                person["altPeople"].append(alt_person)

    loyalty = get_loyalty(person["party_code"], person["congress"])

    person["party_loyalty"] = (
        100 * (1 - loyalty["party"]["nvotes_against_party"] /
               (loyalty["party"]["nvotes_yea_nay"] * 1.0)))

    person["global_loyalty"] = (
        100 * (1 - loyalty["global"]["nvotes_against_party"] /
               (loyalty["global"]["nvotes_yea_nay"] * 1.0)))

    # Quick hack to fix a minor annoying style choice in congressional
    # bioguide.
    if "biography" in person:
        person["biography"] = person["biography"].replace("a Representative",
                                                          "Representative")

    # Biographical lived years string

    if ("died" in person and
            person["died"] is not None and
            person["yearsOfService"][-1][1] > person["died"]):
        person["yearsOfService"][-1][1] = person["died"]

    # Generate a years of life (e.g. (1956 - 1999))
    person["lifeString"] = generate_life_string(person)

    # Fix their last name.
    person["last_name"] = (person["bioname"].split(",")[0].upper()[0] +
                           person["bioname"].split(",")[0].lower()[1:])

    if person["state"] != "President":
        person["stateText"] = (
            " of %s <img src=\"/static/img/states/%s.png\" "
            "class=\"member_flag\">" % (person["state"],
                                        person["state_abbrev"]))
    else:
        person["stateText"] = (
            ", President of the United States "
            "<img src=\"/static/img/states/US.png\" class=\"member_flag\">")

    person["plotIdeology"] = (1 if "nominate" in person and
                              "dim1" in person["nominate"] and
                              person["nominate"]["dim2"] is not None else 0)

    return person


def twitter_card(person):
    """ Extracts and returns person's twitter card. """

    if "twitter_card" not in person:
        return None

    twitter_card_out = person["twitter_card"]
    twitter_card_out["icpsr"] = person["icpsr"]
    return twitter_card_out


if __name__ == "__main__":
    result = member_lookup({'icpsr': 14910}, 1)["results"][0]
    print(check_for_party_switch(result))
