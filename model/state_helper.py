""" Helper functions which respond to state queries. """

from __future__ import print_function
from model.config import config


def state_lookup(short_name):
    """ Get all data from state short name. """

    results = next((x for x in config["states"]
                    if x["state_abbrev"].lower() == short_name.lower()),
                   None)
    if results is None:
        return {"name": "Error", "icpsr": 0,
                "fips": 0, "vns": 0, "state_abbrev": short_name}

    return results


def state_name_to_abbrev(state_name):
    """ Convert state name to abbreviation. """
    results = next((x for x in config["states"] if
                    x["name"].lower() == state_name.lower().strip()), None)
    if results is None:
        return {"name": "Error", "icpsr": 0,
                "fips": 0, "vns": 0, "state_abbrev": state_name}

    return results


def get_state_name(short_name):
    """ Quick state 2-character -> full name converter """
    return state_lookup(short_name)["name"]


def state_icpsr(short_name):
    """ Quick state 2-character -> ICPSR numeric converter """
    return state_lookup(short_name)["state_icpsr"]


if __name__ == "__main__":
    print(state_lookup("AK"))
    print(state_lookup("DC"))
    print(get_state_name("SD"))
    print(state_lookup("QQ"))
    print(get_state_name(u"ND"))
