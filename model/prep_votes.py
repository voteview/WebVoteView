""" Prepares votes for output. """

from __future__ import print_function
import traceback
import six
import model.download_votes


def prep_votes(vote_query, person):
    """ Prepares a person's votes for output. """

    if "errorMessage" in vote_query or "rollcalls" not in vote_query:
        return []

    votes = vote_query["rollcalls"]
    id_set = [v["id"] for v in votes]
    rollcalls_final = model.download_votes.download_votes_api(
        id_set, "Web_Person", person["icpsr"])

    if ("rollcalls" not in rollcalls_final or
            not rollcalls_final["rollcalls"]):
        return []

    for i in range(len(id_set)):
        # For each vote, fetch the person's vote.
        try:
            # First, match the rollcall to vote id.
            individual_vote = next((
                r for r in rollcalls_final["rollcalls"] if
                r["id"] == votes[i]["id"]), None)

            # If there's none, set some defaults.
            if not individual_vote:
                raise Exception

            # Now we need to extract the actual vote.
            vote_extracted = next((
                v for v in individual_vote["votes"] if
                v["icpsr"] == person["icpsr"]), None)

            if not vote_extracted or "vote" not in vote_extracted:
                continue

            # Fill in vote and probability if one is known.
            votes[i]["myVote"] = vote_extracted["vote"]
            if "prob" in vote_extracted:
                votes[i]["myProb"] = vote_extracted["prob"]
        except Exception:
            print(traceback.format_exc())
            votes[i]["myVote"] = "Abs"
            votes[i]["partyLabelVote"] = "N/A"
            votes[i]["pVSum"] = 0
            continue

        # Now isolate the party vote info.
        try:
            party_votes = individual_vote["party_vote_counts"]
            votes[i]["partyVote"] = next((
                v for k, v in six.iteritems(party_votes) if
                k == str(person["party_code"])), None)

            if votes[i]["partyVote"]:
                votes[i]["pVSum"] = sum(
                    [1 * v if int(k) <= 3 else
                     -1 * v if int(k) <= 6 else
                     0 for k, v in six.iteritems(votes[i]["partyVote"])])
                votes[i]["yea"] = sum([
                    1 * v if int(k) <= 3 else
                    0 for k, v in six.iteritems(votes[i]["partyVote"])])
                votes[i]["nay"] = sum([
                    1 * v if int(k) > 3 and int(k) <= 6 else
                    0 for k, v in six.iteritems(votes[i]["partyVote"])])
                votes[i]["abs"] = sum([
                    1 * v if int(k) > 6 else
                    0 for k, v in six.iteritems(votes[i]["partyVote"])])

                votes[i]["partyLabelVote"] = (
                    "Yea" if votes[i]["pVSum"] > 0 else
                    "Nay" if votes[i]["pVSum"] < 0 else
                    "Tie")
            else:
                votes[i]["partyLabelVote"] = "N/A"
                votes[i]["pVSum"] = 0
        except Exception:
            print("Error calculating party vote.")
            votes[i]["partyLabelVote"] = "N/A"
            votes[i]["pVSum"] = 0

    return votes


def fix_vote_probability(prob):
    """ Fix: textual display of probabilities near 0/1 """
    if int(round(prob)) == 100:
        return ">99"
    elif int(round(prob)) < 1:
        return "<1"

    return int(round(prob))


def fix_punctuation(text):
    """ Simply ensures the text ends in a period. """
    if text.endswith(".") or text.endswith(". "):
        return text

    return text + ". "
