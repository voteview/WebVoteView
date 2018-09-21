from searchParties import partyLookup
from searchMeta import metaLookup

def getLoyalty(party_code, congress):
    party_loyalty = partyLookup({"id": int(party_code)}, "Web_Members")
    party_cong_loyalty = party_loyalty[str(congress)]

    global_loyalty = metaLookup("Web_Members")
    global_cong_loyalty = global_loyalty["loyalty_counts"][str(congress)]

    return {"global": global_cong_loyalty, "party": party_cong_loyalty}

