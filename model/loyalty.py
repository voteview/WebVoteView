""" Helpers to deal with party and congress level loyalty. """

from model.search_parties import party_lookup
from model.search_meta import meta_lookup


def get_loyalty(party_code, congress):
    """ Returns a party-congress loyalty pair. """
    party_loyalty = party_lookup({"id": int(party_code)}, "Web_Members")
    try:
        party_cong_loyalty = party_loyalty[str(congress)]
    except Exception:
        party_cong_loyalty = 100

    global_loyalty = meta_lookup("Web_Members")
    try:
        global_cong_loyalty = global_loyalty["loyalty_counts"][str(congress)]
    except Exception:
        global_cong_loyalty = 100

    return {"global": global_cong_loyalty, "party": party_cong_loyalty}
