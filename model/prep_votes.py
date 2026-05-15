""" Prepares votes for output. """

from __future__ import print_function
import traceback
import six
import model.download_votes
from model.config import db
from model.download_votes import waterfall_text, waterfall_question


_PERSON_VOTE_FIELDS = {
    "id": 1, "date": 1, "rollnumber": 1, "congress": 1, "chamber": 1,
    "yea_count": 1, "nay_count": 1, "vote_desc": 1, "description": 1,
    "short_description": 1, "vote_description": 1, "vote_title": 1,
    "vote_question": 1, "question": 1, "vote_question_text": 1,
    "amendment_author": 1, "vote_document_text": 1, "bill_number": 1,
    "sponsor": 1, "key_flags": 1, "party_vote_counts": 1, "_id": 0,
}

_CAST_CODE_TO_VOTE = {1: "Yea", 2: "Yea", 3: "Yea",
                      4: "Nay", 5: "Nay", 6: "Nay",
                      7: "Abs", 8: "Abs", 9: "Abs"}


def prep_person_votes_fast(rollcall_ids, person):
    """
    One-shot fetch of a person's votes for the given rollcall IDs, projecting
    only the voter's own entry from the votes array. Avoids the per-batch
    download_votes_api round trips and ships ~100x less data than fetching
    every senator's vote on every rollcall.
    """
    if not rollcall_ids:
        return []

    icpsr = int(person["icpsr"])
    party_code_str = str(person["party_code"])

    fields = dict(_PERSON_VOTE_FIELDS)
    fields["votes"] = {"$elemMatch": {"icpsr": icpsr}}

    docs = list(db.voteview_rollcalls.find(
        {"id": {"$in": list(rollcall_ids)}}, fields))

    by_id = {d["id"]: d for d in docs}
    results = []
    for rid in rollcall_ids:
        doc = by_id.get(rid)
        if not doc:
            continue

        doc["text"] = waterfall_text(doc)
        doc["question"] = waterfall_question(doc)

        try:
            voter = (doc.get("votes") or [None])[0]
            if voter and "cast_code" in voter:
                doc["myVote"] = _CAST_CODE_TO_VOTE.get(voter["cast_code"], "Abs")
                if "prob" in voter and voter["prob"] is not None:
                    doc["myProb"] = int(round(voter["prob"]))
            else:
                doc["myVote"] = "Abs"
        except Exception:
            doc["myVote"] = "Abs"

        try:
            party_votes = doc.get("party_vote_counts") or {}
            doc["partyVote"] = party_votes.get(party_code_str)
            if doc["partyVote"]:
                pv_sum = sum(1 * v if int(k) <= 3 else
                             -1 * v if int(k) <= 6 else 0
                             for k, v in six.iteritems(doc["partyVote"]))
                doc["pVSum"] = pv_sum
                doc["yea"] = sum(v for k, v in six.iteritems(doc["partyVote"])
                                 if int(k) <= 3)
                doc["nay"] = sum(v for k, v in six.iteritems(doc["partyVote"])
                                 if 3 < int(k) <= 6)
                doc["abs"] = sum(v for k, v in six.iteritems(doc["partyVote"])
                                 if int(k) > 6)
                doc["partyLabelVote"] = ("Yea" if pv_sum > 0 else
                                         "Nay" if pv_sum < 0 else "Tie")
            else:
                doc["partyLabelVote"] = "N/A"
                doc["pVSum"] = 0
        except Exception:
            doc["partyLabelVote"] = "N/A"
            doc["pVSum"] = 0

        doc.pop("votes", None)
        results.append(doc)

    return results


def prep_votes(vote_query, person):
    """ Prepares a person's votes for output. """

    if "errorMessage" in vote_query or "rollcalls" not in vote_query:
        return []

    votes = vote_query["rollcalls"]
    id_set = [v["id"] for v in votes]

    # download_votes_api enforces a 100-id abuse cap, so batch internal calls
    batch_size = 100
    rollcalls_final = {"rollcalls": []}
    for start in range(0, len(id_set), batch_size):
        batch = id_set[start:start + batch_size]
        batch_result = model.download_votes.download_votes_api(
            batch, "Web_Person", person["icpsr"])
        if "rollcalls" in batch_result and batch_result["rollcalls"]:
            rollcalls_final["rollcalls"].extend(batch_result["rollcalls"])

    if not rollcalls_final["rollcalls"]:
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
                int(v["icpsr"]) == int(person["icpsr"])), None)

            if not vote_extracted or "vote" not in vote_extracted:
                votes[i]["myVote"] = "Abs"
                votes[i]["partyLabelVote"] = "N/A"
                votes[i]["pVSum"] = 0
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


def sort_votes_by_column(votes, sort_col, sort_dir):
    """ Sort a list of prepped votes by column index. sort_dir: -1=desc, 1=asc """
    reverse = (sort_dir == -1)

    if sort_col == 2:  # Party Vote
        order = {"Yea": 3, "Tie": 2, "Nay": 1, "N/A": 0}
        votes.sort(key=lambda v: order.get(v.get("partyLabelVote", "N/A"), 0),
                   reverse=reverse)
    elif sort_col == 3:  # Member Vote
        order = {"Yea": 3, "Nay": 2, "Abs": 1}
        votes.sort(key=lambda v: order.get(v.get("myVote", "Abs"), 1),
                   reverse=reverse)
    elif sort_col == 4:  # Vote Probability (mirrors data-impute-sort logic)
        def prob_key(v):
            if "myProb" not in v:
                return 0
            prob = int(round(v["myProb"]))
            return prob if v.get("myVote") == "Abs" else 1000 + prob
        votes.sort(key=prob_key, reverse=reverse)
    elif sort_col == 5:  # Result (yea / total ratio, mirrors splitFunc)
        def result_key(v):
            yea = v.get("yea_count") or 0
            nay = v.get("nay_count") or 0
            total = yea + nay
            return yea / total if total > 0 else 0.5
        votes.sort(key=result_key, reverse=reverse)

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
