"""
Helpers for downloading the Excel file of votes (not the actual file output,
which is handled in write_excel instead.)
"""

from __future__ import print_function
import pymongo
from model.config import config
from model.download_votes import download_votes_api
from model.write_excel import WriteExcel

# Connection
client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]


def download_excel(ids):
    """ Download vote IDs to Excel. """

    # These are only used for XLS writing
    infofields = [('id', 'id'), ('icpsr', 'icpsr'),
                  ('state_abbrev', 'state_abbrev'),
                  ('district_code', 'district_code'),
                  ('cqlabel', 'cqlabel'),
                  ('name', 'name'),
                  ('party_code', 'party_code')]

    descriptionfields = [('id', 'id'),
                         ('chamber', 'chamber'),
                         ('congress', 'congress'),
                         ('date', 'date'),
                         ('rollnumber', 'rollnumber'),
                         ('description', 'description')]

    icpsrfields = [('icpsr', 'icpsr'),
                   ('id', 'id'),
                   ('name', 'name'),
                   ('state_abbrev', 'state_abbrev')]

    results = download_votes_api(ids, apitype="R")

    if 'errormessage' in results:
        return [-1, results['errormessage']]

    # Header row for rollcalls
    rollcalls = [['vote'] + [f[1] for f in descriptionfields]]

    icpsr_set = {}
    member_set = {}

    for i, res in enumerate(results['rollcalls']):
        # Append rollcalls to rows for rollcall sheet
        rollcalls.append(['V%i' % i] + [res[f[0]] for f in descriptionfields])
        for vote in res['votes']:
            if vote['icpsr'] in icpsr_set:
                icpsr_set[vote['icpsr']][i] = vote["cast_code"]
                if vote['id'] not in member_set:
                    member_set[vote['id']] = {key[1]: vote[key[0]] for
                                              key in infofields}
                else:
                    icpsr_set[vote['icpsr']] = {
                        i: vote["cast_code"],
                        'name': vote['name'],
                        'state_abbrev': vote['state_abbrev'],
                        'id': vote['id'],
                        'icpsr': vote['icpsr']}
                    member_set[vote['id']] = {key[1]: vote[key[0]] for
                                              key in infofields}

        # Write member info fields
        votes = [[f[1] for f in icpsrfields] +
                 ["V%i" % (i + 1) for i in range(len(results['rollcalls']))]]

        members = [[f[1] for f in infofields]]

        for _, icpsr in icpsr_set.items():
            votes.append([icpsr[f[0]] for f in icpsrfields] +
                         [icpsr[i] if i in icpsr else 0 for i in
                          range(len(results['rollcalls']))])

        for _, member in member_set.items():
            members.append([member[f[0]] for f in infofields])

    wxls = WriteExcel(rollcalls=rollcalls, votes=votes, members=members)
    wxls.addVotes()
    wxls.addRollcalls()
    wxls.addMembers()
    return [0, wxls.render()]


def download_stash(stash):
    """ Downloads stash to Excel format. """
    if not stash:
        return [-1, "Error: No stash ID provided."]
    res = db.stash.find_one({"id": stash})
    if not res or res is None:
        return [-1, "Error: Invalid stash ID provided."]

    vote_ids = []
    if "old" in res:
        vote_ids = vote_ids + res["old"]
    if "votes" in res:
        vote_ids = list(set(vote_ids + res["votes"]))
    return download_excel(vote_ids)


if __name__ == "__main__":
    print("Begin download...")
    status, output = download_excel("RH1120013,RH1120011")

    if status == 0:
        print("OK")
    else:
        print("Error")
        print(output)
