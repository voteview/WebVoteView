import urllib
import re
import traceback
import os
import glob
import datetime
import time
import json
import bottle
import unidecode
from fuzzywuzzy import fuzz
from bson.json_util import dumps
from pdb import set_trace as st

from model.searchVotes import query
import model.downloadVotes  # Namespace issue
from model.emailContact import sendEmail
from model.searchMembers import memberLookup, getMembersByCongress, getMembersByParty, getMembersByPrivate
from model.searchParties import partyLookup
from model.articles import get_article_meta, list_articles
from model.searchMeta import metaLookup
from model.bioData import yearsOfService, checkForPartySwitch, congressesOfService, congressToYear
from model.prepVotes import prepVotes
from model.geoLookup import addressToLatLong, latLongToDistrictCodes, lat_long_to_polygon
from model.searchAssemble import assembleSearch
import model.downloadXLS
import model.stashCart
import model.partyData
import model.logQuota

# Turn this off on production:
devserver = int(open("server.txt", "r").read().strip())
if devserver:
    bottle.debug(True)
else:
    bottle.debug(False)

# Setup
app = application = bottle.Bottle()
bottle.BaseTemplate.defaults['get_url'] = app.get_url
bottle.BaseTemplate.defaults['template'] = bottle.template
bottle.TEMPLATE_PATH.append('/static/bookreader')
bottle.TEMPLATE_PATH.append('/static/bookreader/BookReader')

# Debug timing to improve speed
timeLabels = []
timeNums = []


def clearTime():
    timeLabels = []
    timeNums = []


def timeIt(label):
    timeLabels.append(label)
    timeNums.append(time.time())


def zipTimes():
    tN = []
    for i in xrange(0, len(timeNums)):
        if i == 0:
            tN.append(0)
        else:
            tN.append(round(timeNums[i] - timeNums[i - 1], 3))
    return zip(timeLabels, tN)


def getBase(urlparts):
    domain = urlparts.scheme + "://" + urlparts.netloc + "/"
    return domain

# Helper function for handling bottle arguments and setting defaults:


def defaultValue(x, value=None):
    return x is not "" and x or value


#
# Web pages
#
# Pass through static content -- nginx should handle this, but if it
# doesn't, bottle will
@app.route('/static/<path:path>')
def callback(path):
    return bottle.static_file(path, "./static")


# Index
@app.route("/")
@app.route("/search/")
@app.route("/search/<search_string>")
def index(search_string=""):
    clearTime()
    timeIt("begin")

    BASE_URL = getBase(bottle.request.urlparts)

    try:
        argDict = {}
        for k, v in bottle.request.params.iteritems():
            argDict[k] = v
    except:
        pass

    timeIt("assembleArgs")

    try:
        if "fromDate" in argDict:
            argDict["fromDate"] = argDict["fromDate"].replace("/", "-")
            argDict["fromDate"] = re.sub(
                r"[^0-9\-\ ]", "", argDict["fromDate"])
        if "toDate" in argDict:
            argDict["toDate"] = argDict["toDate"].replace("/", "-")
            argDict["toDate"] = re.sub(r"[^0-9\-\ ]", "", argDict["toDate"])
        if "fromCongress" in argDict:
            argDict["fromCongress"] = int(argDict["fromCongress"])
        if "toCongress" in argDict:
            argDict["toCongress"] = int(argDict["toCongress"])
        if "support" in argDict and "," in argDict["support"]:
            try:
                argDict["supportMin"], argDict["supportMax"] = [
                    int(x) for x in argDict["support"].split(",")]
            except:
                pass
        elif "support" in argDict:
            try:
                support = int(argDict["support"])
                argDict["supportMin"] = support - 1
                argDict["supportMax"] = support + 1
            except:
                pass
        timeIt("doneAssembly")
        output = bottle.template("views/search", args=argDict,
                                 search_string=search_string, timeSet=zipTimes(), base_url=BASE_URL)
    except:
        output = bottle.template(
            "views/error", errorMessage=traceback.format_exc())
        # errorMessage="Error: One or more of the parameters you used to call
        # this page was misspecified.")

    return output

# Static Pages with no arguments, just passthrough the template.
# Really we should just cache these, but anyway.


@app.route("/about")
def about():
    output = bottle.template('views/about')
    return output


@app.route("/quota")
@app.route("/abuse")
def quota():
    output = bottle.template("views/quota")
    return output


@app.route("/data")
def data():
    maxCongress = json.load(open("static/config.json", "r"))["maxCongress"]
    data_articles = list_articles("data")
    current_year = datetime.datetime.now().year
    output = bottle.template("views/data", maxCongress=maxCongress, articles = data_articles, year = current_year)
    return output


@app.route("/past_data")
def past_data():
    blacklist = [".gitkeep"]
    folder_files = [x for x in reversed(sorted(os.listdir("static/db/"))) if x not in blacklist]
    return bottle.template("views/past_data", folder_files = folder_files)


@app.route("/research")
def research():
    output = bottle.template("views/research")
    return output


# Pages that have arguments
@app.route("/explore")
@app.route("/explore/<chamber:re:house|senate>")
def explore(chamber="house"):
    # Security to prevent the argument being passed through being malicious.
    if chamber != "senate":
        chamber = "house"

    output = bottle.template("views/explore", chamber=chamber)
    return output


@app.route("/congress")
@app.route("/congress/<chamber:re:house|senate>")
@app.route("/congress/<chamber:re:house|senate>/<tv>")
def congress(chamber="senate", tv=""):
    if chamber != "senate":
        chamber = "house"
    if tv != "text":
        tv = ""

    maxCongress = json.load(open("static/config.json", "r"))["maxCongress"]
    congress = defaultValue(bottle.request.params.congress, maxCongress)
    meta = metaLookup()

    output = bottle.template("views/congress", chamber=chamber, congress=congress, maxCongress=maxCongress,
                             dimweight=meta["nominate"][
                                 "second_dimweight"], nomBeta=meta["nominate"]["beta"],
                             tabular_view=tv)
    return output


@app.route("/district")
@app.route("/district/<search>")
def district(search=""):
    meta = metaLookup()
    output = bottle.template("views/district", search=search, dimweight=meta[
                             "nominate"]["second_dimweight"], nomBeta=meta["nominate"]["beta"])
    return output


@app.route("/parties")
@app.route("/parties/<party>/<congStart>")
@app.route("/parties/<party>")
def parties(party="all", congStart=-1):
    if type(congStart) == type(""):  # Capture SEO-friendly links.
        congStart = -1

    # Just default for now
    try:
        party = int(party)
    except:
        maxCongress = json.load(open("static/config.json", "r"))["maxCongress"]
        output = bottle.template(
            "views/parties_glance", maxCongress=maxCongress)
        return output

    if congStart == -1:
        congStart = int(
            json.load(open("static/config.json", "r"))["maxCongress"])
    else:
        try:
            congStart = int(congStart)
        except:
            congStart = 0

    if party not in xrange(0, 50001):
        party = 200
    partyData = model.partyData.getPartyData(party)
    if "fullName" in partyData:
        partyNameFull = partyData["fullName"]
    else:
        partyNameFull = ""

    output = bottle.template("views/parties", party=party, partyData=partyData,
                             partyNameFull=partyNameFull, congStart=congStart)
    return output

@app.route("/api/getloyalty")
def getloyalty(party_code="", congress=""):
    party_code = defaultValue(bottle.request.params.party_code, party_code)
    congress = defaultValue(bottle.request.params.congress, congress)

    party_loyalty = partyLookup({"id": int(party_code)}, "Web_Members")
    party_cong_loyalty = party_loyalty[str(congress)]

    global_loyalty = metaLookup("Web_Members")
    global_cong_loyalty = global_loyalty["loyalty_counts"][str(congress)]

    return {"global": global_cong_loyalty, "party": party_cong_loyalty}

@app.route("/articles/<slug>")
def article(slug = ""):
    if not len(slug) or not os.path.isfile(os.path.join("static/articles", slug, slug + ".json")):
	return bottle.template("views/error", errorMessage = "The article you selected is not a valid article ID.")

    meta_set = get_article_meta(slug)
    output = bottle.template("views/articles", slug = slug, meta = meta_set)
    return output

@app.route("/person")
@app.route("/person/<icpsr>")
@app.route("/person/<icpsr>/<garbage>")
def person(icpsr=0, garbage=""):
    clearTime()
    timeIt("begin")
    if not icpsr:
        icpsr = defaultValue(bottle.request.params.icpsr, 0)

    skip = 0

    # Easter Egg
    keith = defaultValue(bottle.request.params.keith, 0)

    # Pull by ICPSR
    person = memberLookup({"icpsr": icpsr}, 1)
    timeIt("memberLookup")

    # If we have no error, follow through
    if not "errormessage" in person:
        person = person["results"][0]
        if not "bioname" in person:
            person["bioname"] = "ERROR NO NAME IN DATABASE PLEASE FIX."
        votes = []
        # Look up votes

        timeIt("nameFunc")

        # Check if bio image exists
        bioFound = 0
        if not os.path.isfile("static/img/bios/" + str(person["icpsr"]).zfill(6) + ".jpg"):
            # If not, use the default silhouette
            if not keith:
                person["bioImg"] = "silhouette.png"
            else:
                person["bioImg"] = "keith.png"
        else:
            person["bioImg"] = str(person["icpsr"]).zfill(6) + ".jpg"
            bioFound = 1

        timeIt("bioImg")

        # Get years of service
        person["yearsOfService"] = yearsOfService(person["icpsr"], "")
        person["yearsOfServiceSenate"] = yearsOfService(
            person["icpsr"], "Senate")
        person["yearsOfServiceHouse"] = yearsOfService(
            person["icpsr"], "House")
        # Fix final date of service to match final voting date.
        try:
            if len(person["yearsOfServiceSenate"]):
                if person["yearsOfServiceSenate"][-1][1] > int(person["voting_dates"]["Senate"][1].split("-")[0]) and int(person["voting_dates"]["Senate"][1].split("-")[0]):
                    person["yearsOfServiceSenate"][-1][1] = int(
                        person["voting_dates"]["Senate"][1].split("-")[0])
        except:
            pass
        try:
            if len(person["yearsOfServiceHouse"]):
                if person["yearsOfServiceHouse"][-1][1] > int(person["voting_dates"]["House"][1].split("-")[0]) and int(person["voting_dates"]["House"][1].split("-")[0]):
                    person[
                        "yearsOfServiceHouse"][-1][1] = int(person["voting_dates"]["House"][1].split("-")[0])
        except:
            pass

        person["congressesOfService"] = congressesOfService(person[
                                                            "icpsr"], "")
        person["congressLabels"] = {}
        for congressChunk in person["congressesOfService"]:
            for cong in range(congressChunk[0], congressChunk[1] + 1):
                person["congressLabels"][cong] = str(cong) + "th Congress (" + str(
                    congressToYear(cong, 0)) + "-" + str(congressToYear(cong, 1)) + ")"

        timeIt("congressLabels")

        # Find out if we have any other ICPSRs that are this person for another
        # party
        altICPSRs = checkForPartySwitch(person)
        if "results" in altICPSRs:
            person["altPeople"] = []
            # Iterate through them
            for alt in altICPSRs["results"]:
                # Look up this one
                altPerson = memberLookup({"icpsr": alt}, 1)["results"][0]
                if not "errormessage" in altPerson:
                    # Get their years of service
                    altPerson["yearsOfService"] = yearsOfService(altPerson[
                                                                 "icpsr"])
                    # If we don't have a bio image for main guy, borrow from
                    # his previous/subsequent incarnations
                    if not bioFound and os.path.isfile("static/img/bios/" + str(altPerson["icpsr"]).zfill(6) + ".jpg"):
                        person["bioImg"] = str(
                            altPerson["icpsr"]).zfill(6) + ".jpg"
                        bioFound = 1

                    if not altPerson["icpsr"] in [x["icpsr"] for x in person["altPeople"]]:
                        person["altPeople"].append(altPerson)

        timeIt("partySwitches")
        loyalty = getloyalty(person["party_code"], person["congress"])
        person["party_loyalty"] = 100 * (1 - loyalty["party"]["nvotes_against_party"] / (
            loyalty["party"]["nvotes_yea_nay"] * 1.0))
        person["global_loyalty"] = 100 * (1 - loyalty["global"][
                                          "nvotes_against_party"] / (loyalty["global"]["nvotes_yea_nay"] * 1.0))

        if "biography" in person:
            person["biography"] = person["biography"].replace(
                "a Representative", "Representative")

        if not "twitter_card" in person:
            twitter_card = 0
        else:
            twitter_card = person["twitter_card"]
            twitter_card["icpsr"] = person["icpsr"]

        timeIt("readyOut")
        # Go to the template.
        output = bottle.template("views/person", person=person,
                                 timeSet=zipTimes(), skip=0, twitter_card=twitter_card)
        return(output)

    # If we have an error, return an error page
    else:
        output = bottle.template(
            "views/error", errorMessage=person["errormessage"])
        return(output)


def count_images(publication, file_number):
    """Return the number of scans in the directory."""
    format_string = 'static/img/scans/{}/{:>03}/*'
    glob_string = format_string.format(publication, file_number)
    image_paths = glob.glob(glob_string)
    return len(image_paths)


@app.route('/source_images/<publication>/BookReader')
@app.route('/source_images/<publication>/<file_number>/<page_number>', name='source_images')
def source_images(publication, file_number, page_number, **kwargs):
    return bottle.template(
        'views/source_images',
        publication=publication,
        file_number=file_number,
        page_number=page_number,
        num_leafs=count_images(publication, file_number),
    )


def mark_linkable_sources(sources):

    publications_currently_linkable = ['House Journal', ]
    source_strings = []
    # link_str = u'<a
    # href="source-images/{publication}/{file_number}/{page_number}">{publication}</a>'
    new_sources = []
    for source in sources:
        new = source.copy()
        new['is_linkable'] = source[
            'publication'] in publications_currently_linkable
        new_sources.append(new)
    return new_sources


@app.route("/rollcall")
@app.route("/rollcall/<rollcall_id>")
def rollcall(rollcall_id=""):
    if not rollcall_id:
        output = bottle.template(
            "views/error", errorMessage="You did not provide a rollcall ID.")
        return(output)
    elif "," in rollcall_id:
        output = bottle.template(
            "views/error", errorMessage="You may only view one rollcall ID at a time.")
        return(output)

    rollcall = model.downloadVotes.downloadAPI(rollcall_id, "Web")
    mapParties = int(defaultValue(bottle.request.params.mapParties, 1))

    if not "rollcalls" in rollcall or "errormessage" in rollcall:
        output = bottle.template(
            "views/error", errorMessage=rollcall["errormessage"])
        return(output)

    meta = metaLookup()
    sponsor = {}
    if "rollcalls" in rollcall and "sponsor" in rollcall["rollcalls"][0]:
        try:
            sponsor = [x for x in rollcall["rollcalls"][0]["votes"]
                       if x["icpsr"] == rollcall["rollcalls"][0]["sponsor"]][0]
        except:
            sponsor = {}

    current_rollcall = rollcall['rollcalls'][0]
    output = bottle.template(
        "views/vote",
        rollcall=current_rollcall,
        dimweight=meta['nominate']['second_dimweight'],
        nomBeta=meta["nominate"]["beta"],
        mapParties=mapParties,
        sponsor=sponsor,
        sources=mark_linkable_sources(current_rollcall.get('dtl_sources', [])),
    )
    return(output)


# Stash saved links redirect
@app.route("/s/<savedhash>")
def savedHashRedirect(savedhash):
    if not savedhash:
        return bottle.template("views/error", errorMessage="Invalid redirect ID. This link is not valid. Please notify the person who provided this link to you that it is not operational.")
    else:
        status = model.stashCart.checkExists(savedhash.strip())["status"]
        if not status:
            bottle.redirect("/search/?q=saved: " + savedhash)
        else:
            return bottle.template("views/error", errorMessage="Invalid redirect ID. This link is not valid. Please notify the person who provided this link to you that it is not operational.")


#
#
# API methods
#
#
@app.route("/api/getmembersbycongress", method="POST")
@app.route("/api/getmembersbycongress")
def getmembersbycongress():
    st = time.time()
    congress = defaultValue(bottle.request.params.congress, 0)
    chamber = defaultValue(bottle.request.params.chamber, "").title()
    if chamber != "Senate" and chamber != "House":
        chamber = ""
    api = defaultValue(bottle.request.params.api, "")
    out = getMembersByCongress(congress, chamber, api)
    if api == "Web_Congress" and "results" in out:
        for i in range(0, len(out["results"])):
            memberRow = out["results"][i]

            memberRow["minElected"] = congressToYear(
                memberRow["congresses"][0][0], 0)

            out["results"][i] = memberRow

    out["timeElapsed"] = time.time() - st
    return out


@app.route("/api/geocode")
def geocode():
    q = defaultValue(bottle.request.params.q, "")
    if not q:
        return {"status": 1, "error_message": "No address specified."}
    else:
        return addressToLatLong(bottle.request, q)

@app.route("/api/districtPolygonLookup")
def districtPolygonLookup():
    try:
        lat = float(defaultValue(bottle.request.params.lat, 0))
        long = float(defaultValue(bottle.request.params.long, 0))
    except:
        return {"status": 1, "error_message": "Invalid lat/long coordinates."}

    current_congress_polygon = lat_long_to_polygon(bottle.request, lat, long)

    if current_congress_polygon:
        return {"polygon": current_congress_polygon}
    else:
        return {"polygon": []}

@app.route("/api/districtLookup")
def districtLookup():
    maxCongress = json.load(open("static/config.json", "r"))["maxCongress"]
    try:
        lat = float(defaultValue(bottle.request.params.lat, 0))
        long = float(defaultValue(bottle.request.params.long, 0))
    except:
        return {"status": 1, "error_message": "Invalid lat/long coordinates."}

    results = latLongToDistrictCodes(bottle.request, lat, long)
    if type(results) == type({}) and "status" in results:  # Quota error.
        return results

    if "isDC" in results:
        isDC = results["isDC"]
    else:
        isDC = 0

    if "results" in results:
        resLoop = results["results"]
    else:
        return {"status": 1, "error_message": "No matches."}

    if len(resLoop):
        orQ = []
        atLargeSet = []
        state_abbrev = ""
        for r in resLoop:
            if not len(state_abbrev):
                state_abbrev = r[0]
            if r[2]:
                orQ.append(
                    {"state_abbrev": r[0], "district_code": r[2], "congress": r[1]})
            else:
                atLargeSet.append(r[1])
        if len(atLargeSet):
            for l in atLargeSet:
                matchDistrict = len([x for x in orQ if x["congress"] == l])
                if matchDistrict:
                    pass
                else:
                    for dc in [1, 98, 99]:
                        orQ.append({"state_abbrev": state_abbrev,
                                    "district_code": dc, "congress": l})
        resultsM = getMembersByPrivate({"chamber": "House", "$or": orQ})

        if "results" in resultsM:
            currentCong = 0
            if not isDC:
                currentCong = next((x["district_code"] for x in resultsM[
                                   "results"] if x["congress"] == maxCongress), None)
                currentLookup = getMembersByPrivate({"$or": [{"chamber": "Senate", "state_abbrev": state_abbrev, "congress": maxCongress}, {
                                                    "chamber": "House", "district_code": currentCong, "state_abbrev": state_abbrev, "congress": maxCongress}]})
            if not isDC and "results" in currentLookup:
                return {"status": 0, "results": resultsM["results"], "currentCong": currentCong, "resCurr": currentLookup["results"]}
            elif currentCong:
                return {"status": 0, "results": resultsM["results"], "currentCong": currentCong, "resCurr": []}
            else:
                return {"status": 0, "results": resultsM["results"], "currentCong": 0, "resCurr": []}
        else:
            return {"status": 1, "error_message": "No matches."}
    else:
        return {"status": 1, "error_message": "No matches."}


@app.route("/api/getmembersbyparty")
def getmembersbyparty():
    st = time.time()
    id = defaultValue(bottle.request.params.id, 0)
    try:
        congress = int(defaultValue(bottle.request.params.congress, 0))
    except:
        congress = 0
    api = defaultValue(bottle.request.params.api, "")
    out = getMembersByParty(id, congress, api)
    if api == "Web_Party" and "results" in out:
        for i in range(0, len(out["results"])):
            memberRow = out["results"][i]

            memberRow["minElected"] = congressToYear(
                memberRow["congresses"][0][0], 0)
            out["results"][i] = memberRow

    out["timeElapsed"] = time.time() - st
    return out


@app.route("/api/getmembers", method="POST")
@app.route("/api/getmembers")
def getmembers():
    qDict = {}

    distinct = 0
    api = "Web"

    # Transparently pass through the entire query dictionary
    for key, value in bottle.request.params.iteritems():
        if key == 'distinct':
            distinct = int(defaultValue(value, 0))
        elif key == 'api':
            api = defaultValue(value, "Web")
        else:
            qDict[key] = defaultValue(value)

    return(memberLookup(qDict, distinct=distinct, api=api))


@app.route("/api/searchAssemble", method="POST")
@app.route("/api/searchAssemble")
def searchAssemble():
    q = defaultValue(bottle.request.params.q)
    nextId = defaultValue(bottle.request.params.nextId, 0)

    out = assembleSearch(q, nextId, bottle)
    return(out)


@app.route("/api/getMemberVotesAssemble")
def getMemberVotesAssemble(icpsr=0, qtext="", skip=0):
    icpsr = defaultValue(bottle.request.params.icpsr, 0)
    qtext = defaultValue(bottle.request.params.qtext, "")
    skip = 0
    skip = defaultValue(bottle.request.params.skip, 0)

    if not icpsr:
        output = bottle.template(
            "views/error", errorMessage="No member specified.")
        bottle.response.headers["nextId"] = 0
        return(output)

    person = memberLookup({"icpsr": icpsr})
    if not "error" in person:
        person = person["results"][0]
    else:
        output = bottle.template(
            "views/error", errorMessage=person["errormessage"])
        bottle.response.headers["nextId"] = 0
        return(output)

    votes = []

    if qtext:
        qtext = qtext + " AND (voter: " + str(person["icpsr"]) + ")"
    else:
        qtext = "voter: " + str(person["icpsr"])

    if skip:
        voteQuery = query(qtext, rowLimit=25, jsapi=1,
                          sortSkip=skip, request=bottle.request)
    else:
        voteQuery = query(qtext, rowLimit=25, jsapi=1, request=bottle.request)

    # Outsourced the vote assembly to a model for future API buildout.
    votes = prepVotes(voteQuery, person)
    output = bottle.template("views/member_votes", person=person,
                             votes=votes, skip=skip, nextId=voteQuery["nextId"])

    bottle.response.headers["nextId"] = voteQuery["nextId"]
    return(output)


@app.route("/api/search", method="POST")
@app.route("/api/search")
def search():
    q = defaultValue(bottle.request.params.q)
    startdate = defaultValue(bottle.request.params.startdate)
    enddate = defaultValue(bottle.request.params.enddate)
    chamber = defaultValue(bottle.request.params.chamber)
    icpsr = defaultValue(bottle.request.params.icpsr)
    rapi = defaultValue(bottle.request.params.rapi, 0)
    res = query(q, startdate, enddate, chamber, icpsr=icpsr,
                rapi=rapi, request=bottle.request)
    return(res)


@app.route("/api/getPartyData", method="POST")
@app.route("/api/getPartyData")
def getPartyName():
    id = defaultValue(bottle.request.params.id)
    return(model.partyData.getPartyData(id))


@app.route("/api/download", method="POST")
@app.route("/api/download")
@app.route("/api/download/<rollcall_id>")
def downloadAPI(rollcall_id=""):
    if not rollcall_id:
        rollcall_id = defaultValue(bottle.request.params.rollcall_id)
    apitype = defaultValue(bottle.request.params.apitype, "Web")
    res = model.downloadVotes.downloadAPI(rollcall_id, apitype)
    return(res)


@app.route("/api/exportJSON", method="POST")
@app.route("/api/exportJSON")
def exportJSON():
    id = defaultValue(bottle.request.params.id, "")
    return model.downloadVotes.downloadStash(id)


@app.route("/api/downloadXLS", method="POST")
@app.route("/api/downloadXLS")
def downloadXLS():
    try:
        stash = defaultValue(bottle.request.params.stash, "")
    except:
        stash = ""

    try:
        ids = bottle.request.params.getall("ids")
    except:
        ids = []

    try:
        if type(ids) == type([]):
            ids = ",".join(ids)
    except:
        pass

    if stash:
        statusCode, result = model.downloadXLS.downloadStash(stash)
    else:
        statusCode, result = model.downloadXLS.downloadXLS(ids)

    if statusCode == 0:
        bottle.response.content_type = 'application/vnd.ms-excel'
        currentDateString = datetime.datetime.now().strftime("%Y%m%d_%H%M")
        outputFilename = currentDateString + "_voteview_download.xls"
        bottle.response.headers[
            "Content-Disposition"] = "inline; filename=" + outputFilename
        return(result)
    else:  # Non-zero status code.
        return({"errormessage": result})


@app.route("/api/contact", method="POST")
@app.route("/api/contact")
def contact():
    try:
        title = bottle.request.params.title
        body = bottle.request.params.body
        email = bottle.request.params.email
	person_name = bottle.request.params.yourname
        recaptcha = bottle.request.params["g-recaptcha-response"]
        ip = bottle.request.get("REMOTE_ADDR")
        res = sendEmail(title, body, person_name, email, recaptcha, ip)
        return(res)
    except:
        return(traceback.format_exc())
        return({"error": "You must fill out the entire form before submitting."})


@app.route("/api/stash/<verb:re:init|add|del|get|empty>")
def stash(verb):
    try:
        id = defaultValue(bottle.request.params.id, "")
        votes = bottle.request.params.getall("votes")
    except:
        votes = []

    # return {"test": "foo"}
    return model.stashCart.verb(verb, id, votes)


@app.route("/api/shareableLink")
@app.route("/api/shareableLink", method="POST")
def shareLink():
    try:
        BASE_URL = getBase(bottle.request.urlparts)
        id = defaultValue(bottle.request.params.id, "")
        text = defaultValue(bottle.request.params.text, "")
    except:
        return {"errorMessage": "Invalid ID or text"}

    return model.stashCart.shareableLink(id, text, base_url=BASE_URL)


@app.route("/api/downloaddata", method="POST")
@app.route("/api/downloaddata")
def getData():
    try:
        BASE_URL = getBase(bottle.request.urlparts)
        datType = defaultValue(bottle.request.params.datType, "")
        unit = defaultValue(bottle.request.params.type,
                            None if datType == "ord" else "")
        chamber = defaultValue(bottle.request.params.chamber,
                               None if unit == "party" else "both")
        congress = defaultValue(bottle.request.params.congress, "all")
    except:
        return {"errorMessage": "Invalid query"}

    print(datType)
    print(unit)
    print(chamber)
    print(congress)

    if datType == "" or unit == "":
        return {"errorMessage": "Either type or unit specified incorrectly."}

    STATIC_URL = BASE_URL + "static/data/out/" + unit + "/"
    
    if chamber == "house":
        chamberlet = "H"
    elif chamber == "senate":
        chamberlet = "S"
    elif chamber == "both":
        chamberlet = "HS"
    else:
        return {"errorMessage": chamber + " is an invalid `chamber`"}

    return {"file_url": STATIC_URL + chamberlet + str(congress) + "_" + unit + "." + datType}


@app.route("/api/addAll")
@app.route("/api/addAll", method="POST")
def addAll():
    try:
        id = defaultValue(bottle.request.params.id, "")
        search = defaultValue(bottle.request.params.search, "")
    except:
        return {"errorMessage": "Invalid ID or search."}
    return model.stashCart.addAll(id, search)


@app.route("/api/delAll")
@app.route("/api/delAll", method="POST")
def delAll():
    try:
        id = defaultValue(bottle.request.params.id, "")
        search = defaultValue(bottle.request.params.search, "")
    except:
        return {"errorMessage": "Invalid ID or search."}
    return model.stashCart.delAll(id, search)


@app.route("/api/setSearch")
@app.route("/api/setSearch", method="POST")
def setSearch():
    try:
        id = defaultValue(bottle.request.params.id, "")
        search = defaultValue(bottle.request.params.search, "")
    except:
        return {"errorMessage": "Invalid ID or search"}

    return model.stashCart.setSearch(id, search)


@app.route("/outdated")
def outdate():
    return bottle.template("views/outdated")


@app.route("/api/version")
def apiVersion():
    return({'apiversion': 'Q1 Jan 10, 2017', 'request_hash': model.logQuota.generateSessionID(bottle.request), 'quota_credits': model.logQuota.getCredits(bottle.request)})

if __name__ == '__main__':
    bottle.run(app, host='localhost', port=8080, debug=True, reloader=True)
