""" Helpers to deal with party and congress level loyalty. """

from model.search_parties import party_lookup
from model.search_meta import meta_lookup


def get_loyalty(party_code, congress):
    """ Returns a party-congress loyalty pair. """

    if party_code is None or congress is None:
        return {"status": 1,
                "error_message": "Invalid party code or congress."}

    party_loyalty = party_lookup({"id": int(party_code)}, "Web_Members")
    try:
        party_cong_loyalty = party_loyalty[str(congress)]
    except Exception:
        party_cong_loyalty = {"nvotes_yea_nay": 1, "nvotes_abs": 0, "nvotes_against_party": 0, "nvotes_party_split": 0}

    global_loyalty = meta_lookup("Web_Members")
    try:
        global_cong_loyalty = global_loyalty["loyalty_counts"][str(congress)]
    except Exception:
        global_cong_loyalty = {"nvotes_yea_nay": 1, "nvotes_abs": 0, "nvotes_against_party": 0, "nvotes_party_split": 0}

    # Force people with no votes to have one vote to avoid division by zero.
    if "nvotes_yea_nay" not in global_cong_loyalty or not global_cong_loyalty["nvotes_yea_nay"]:
        global_cong_loyalty["nvotes_yea_nay"] = 1
    if "nvotes_yea_nay" not in party_cong_loyalty or not party_cong_loyalty["nvotes_yea_nay"]:
        party_cong_loyalty["nvotes_yea_nay"] = 1

    return {"global": global_cong_loyalty, "party": party_cong_loyalty}
