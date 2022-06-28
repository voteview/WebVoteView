""" Helper functions for geography lookups. """

from __future__ import print_function
import math
import requests
# Shut up the stupid SSL warning crap
import requests.packages.urllib3
import pymongo
from model.config import config
from model.log_quota import check_quota, add_quota, log_search
from model.state_helper import state_name_to_abbrev

requests.packages.urllib3.disable_warnings()
client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name_geog"]]


def lat_long_warnings(result, address_string, state_name):
    """ Returns warnings to disclaim the lat-long lookup results. """

    warning = []
    is_zip = 0
    if len(address_string) == 10:
        try:
            int(address_string[0:5])
            int(address_string[6:])
            is_zip = 1
            warning.append(
                "The information below is accurate to the ZIP Code "
                "level. To be certain you have the right results, enter "
                "more address detail.")
        except Exception:
            pass
    elif len(address_string) == 5:
        try:
            int(address_string)
            is_zip = 1
            warning.append(
                "The information below is accurate to the ZIP Code "
                "level. To be certain you have the right results, enter "
                "more address detail.")
        except Exception:
            pass

    if (39.83334 > result["geometry"]["location"]["lat"] > 39.8333 and
            -98.5855 > result["geometry"]["location"]["long"] > -98.5856):
        warning.append(
            "Google Maps did not correctly resolve your address. To be "
            "certain you have the right results, enter more address detail.")

    if (not is_zip and "location_type" in result["geometry"] and
            result["geometry"]["location_type"] in
            ["APPROXIMATE", "GEOMETRIC_CENTER"]):
        warning.append(
            "Address lookup did not return an exact result. The information "
            "below may be incorrect. Please adjust the address you entered "
            "to improve result quality.")

    if not is_zip and "partial_match" in result:
        warning.append(
            "The address you entered could not be matched exactly by Google "
            "Maps. The information below may be incorrect. Please adjust the "
            "address you entered to improve results. %s" % state_name)

    if ("bounds" in result["geometry"] and
            "northeast" in result["geometry"]["bounds"] and
            "southwest" in result["geometry"]["bounds"]):
        lat_diff = abs(result["geometry"]["bounds"]["northeast"]["lat"] -
                       result["geometry"]["bounds"]["southwest"]["lat"]) * 69
        lat_avg = (result["geometry"]["bounds"]["northeast"]["lat"] +
                   result["geometry"]["bounds"]["southwest"]["lat"]) / 2
        long_diff = abs(result["geometry"]["bounds"]["northeast"]["lng"] -
                        result["geometry"]["bounds"]["southwest"]["lng"])
        long_diff = math.cos(math.radians(lat_avg)) * 69.172 * long_diff

        if (lat_diff * long_diff > 100 and state_name not in
                ["Alaska", "Delaware", "Montana", "North Dakota",
                 "South Dakota", "Vermont", "Wyoming"]):
            warning.append(
                "Google Maps returned an imprecise result for your address. "
                "Results may be accurate to your state, but not your exact "
                "location. Please adjust the address you entered to improve "
                "results.")

    return warning


def lat_long_warnings_city(state_name, city):
    """ Returns warnings for the territories or missing city info. """

    warning = []
    if state_name == "District of Columbia":
        warning.append(
            "The address you entered is located in or around D.C. "
            "Voteview.com does not track non-voting delegates sent by "
            "D.C. to the House of Representatives. The Representatives "
            "listed below served when the location you entered was "
            "located in Maryland. For more information, see Wikipedia:"
            "<br/><a href=\"https://en.wikipedia.org/wiki/Maryland%27s_3rd_congressional_district\">"
            "Maryland's 3rd congressional district.</a><br/><br/>"
            "For more information about voting rights in D.C., see "
            "Wikipedia:<br/>"
            "<a href=\"https://en.wikipedia.org/wiki/District_of_Columbia_voting_rights\">District of Columbia voting rights</a>"
        )

    if (city == 0 and state_name not in
            ["Alaska", "Delaware", "Wyoming"]):
        if state_name in ["Montana", "North Dakota", "South Dakota",
                          "Vermont"]:
            warning.append(
                "Google Maps could not locate your town or city. Some "
                "historical results may be based on an approximate "
                "location.")
        else:
            warning.append(
                "Google Maps could not locate your town or city. The "
                "results below may be based on an approximate "
                "location")

    return warning


def address_to_lat_long(request, address_string):
    """ Converts an address to a lat-long pair. """
    # Are we over quota?
    quota_check = check_quota(request)
    if quota_check["status"]:
        return {"status": 1,
                "error_message": quota_check["errormessage"]}

    api_key = config["auth"]["geocodeAPI"]
    if not address_string:
        return {"status": 1,
                "error_message": "You must enter an address to continue."}

    print(
        "https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s" %
        (address_string, api_key))

    result = requests.get(
        "https://maps.googleapis.com/maps/api/geocode/json?address=%s&key=%s" %
        (address_string, api_key)).json()

    if "status" in result and result["status"] != "OK":
        return {"status": 1,
                "error_message":
                    "Google Maps failed to complete a lookup for the address "
                    "you entered."}

    if ("results" not in result or not result["results"] or
            "geometry" not in result["results"][0] or
            "location" not in result["results"][0]["geometry"]):
        # Log the failed address lookup and add to quota
        add_quota(request, 1)
        log_search(
            request,
            {"query": "Address Lookup: %s" % address_string,
             "resultNum": -1})

        return {"status": 1,
                "error_message":
                    "Google Maps failed to complete a lookup for the address "
                    "you entered."}

    result = result["results"][0]

    state_name = ""
    if "address_components" in result:
        country = 0
        country_name = ""
        state = 0
        city = 0
        for result_address in result["address_components"]:
            for a_type in result_address["types"]:
                if a_type == "country":
                    country = 1
                    country_name = result_address["long_name"]
                elif a_type == "locality":
                    city = 1
                elif a_type == "administrative_area_level_1":
                    state = 1
                    state_name = result_address["long_name"]

        if country == 0:
            return {"status": 1,
                    "error_message":
                        "Google Maps failed to complete a lookup for the "
                        "address you entered."}
        if state == 0:
            return {"status": 1,
                    "error_message":
                        "Google Maps failed to locate a state matching "
                        "the address you entered."}

        if country_name in ["Puerto Rico", "Guam", "U.S. Virgin Islands",
                            "Northern Mariana Islands", "American Samoa"]:
            map_link = {
                "Puerto Rico": "https://en.wikipedia.org/wiki/Resident_Commissioner_of_Puerto_Rico",
                "Guam": "https://en.wikipedia.org/wiki/Guam%27s_at-large_congressional_district",
                "U.S. Virgin Islands": "https://en.wikipedia.org/wiki/List_of_Delegates_to_the_United_States_House_of_Representatives_from_the_United_States_Virgin_Islands",
                "Northern Mariana Islands": "https://en.wikipedia.org/wiki/United_States_congressional_delegations_from_the_Northern_Mariana_Islands",
                "American Samoa": "https://en.wikipedia.org/wiki/List_of_Delegates_to_the_United_States_House_of_Representatives_from_American_Samoa"
            }[country_name]

            return {"status": 1,
                    "error_message":
                        "Voteview.com does not track non-voting delegates "
                        "sent by unincorporated territories of the United "
                        "States.<br/><br/> For more information about "
                        "historical delegates from %s, please read "
                        "<a href=\"%s\">this Wikipedia article</a><br/><br/>"
                        (country_name, map_link)}

        if country_name != "United States":
            return {"status": 1,
                    "error_message":
                        "The address you entered was from outside the "
                        "United States. (%s)" % country_name}

        warning = lat_long_warnings_city(state_name, city)

    warning += lat_long_warnings(result, address_string, state_name)

    # Log and add to quota.
    add_quota(request, 1)
    log_search(
        request,
        {"query": "Address Lookup: %s" % address_string,
         "resultNum": 1})

    return {"status": 0,
            "lat": result["geometry"]["location"]["lat"],
            "lng": result["geometry"]["location"]["lng"],
            "formatted_address": result["formatted_address"],
            "warnings": warning}


def lat_long_to_polygon(request, lat, lng):
    """ Converts lat-long to a district polygon. """
    # Check if we're over quota?
    quota_check = check_quota(request)
    if quota_check["status"]:
        return {"status": 1,
                "error_message": quota_check["errormessage"]}

    gquery = {"geometry": {"$geoIntersects": {"$geometry": {"type": "Point", "coordinates": [lng, lat]}}}}
    for result in (db.districts.find(gquery, {"geometry.coordinates": 1})
                   .sort([("properties.endcong", -1)]).limit(1)):
        return result["geometry"]["coordinates"]

    return []


def lat_long_to_districts(request, lat, lng):
    """ Converts a lat-long to a series of district codes. """

    # Are we over quota?
    quota_check = check_quota(request)
    if quota_check["status"]:
        return {"status": 1,
                "error_message": quota_check["errormessage"]}

    results = []
    is_dc = 0
    gquery = {"geometry": {"$geoIntersects": {"$geometry":
        {"type": "Point", "coordinates": [lng, lat]}}}}

    for result in db.districts.find(gquery, {'properties': 1}):
        rec = [result['properties'][f] for f in
               ('statename', 'district', 'startcong', 'endcong')]
        if state_name_to_abbrev(rec[0])["state_abbrev"] == "DC":
            is_dc = 1
            continue

        for cng in range(int(rec[2]), int(rec[3]) + 1):
            results.append([
                state_name_to_abbrev(rec[0])["state_abbrev"],
                cng,
                int(rec[1])])

    # Costlier because it's more intense on our side.
    add_quota(request, 2)
    return {"is_dc": is_dc, "results": results}