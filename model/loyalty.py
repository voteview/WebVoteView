from searchParties import partyLookup
from searchMeta import metaLookup

def getLoyalty(party_code, congress):
    party_loyalty = partyLookup({"id": int(party_code)}, "Web_Members")
    try:
        party_cong_loyalty = party_loyalty[str(congress)]
    except:
        party_cong_loyalty = 100

    global_loyalty = metaLookup("Web_Members")
    try:
        global_cong_loyalty = global_loyalty["loyalty_counts"][str(congress)]
    except:
        global_cong_loyalty = 100

    return {"global": global_cong_loyalty, "party": party_cong_loyalty}

