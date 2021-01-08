from searchParties import partyLookup
from searchMeta import metaLookup

def getLoyalty(party_code, congress):
    party_loyalty = partyLookup({"id": int(party_code)}, "Web_Members")

    try:
        party_cong_loyalty = party_loyalty[str(congress)]
    except:
        party_cong_loyalty = {"nvotes_yea_nay": 1, "nvotes_abs": 0, "nvotes_against_party": 0, "nvotes_party_split": 0}

    global_loyalty = metaLookup("Web_Members")
    try:
        global_cong_loyalty = global_loyalty["loyalty_counts"][str(congress)]
    except:
        global_cong_loyalty = {"nvotes_yea_nay": 1, "nvotes_abs": 0, "nvotes_against_party": 0, "nvotes_party_split": 0}

    return {"global": global_cong_loyalty, "party": party_cong_loyalty}

