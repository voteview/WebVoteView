""" Main Bottle dispatcher for voteview.com """

# pylint: disable=W0703,C0103,no-member
from __future__ import print_function
import re
import traceback
import os
import glob
import datetime
import time
import bottle
from model.config import config
from model.search_votes import query
import model.download_votes  # Namespace issue
from model.email_contact import send_email, newsletter_subscribe
from model.search_members import (member_lookup, get_members_by_congress,
                                  get_members_by_party,
                                  district_member_lookups)
from model.articles import get_article_meta, list_articles
from model.search_meta import meta_lookup
from model.bio_data import congress_to_year, assemble_person_meta, twitter_card
from model.prep_votes import prep_votes
from model.geo_lookup import (address_to_lat_long,
                              lat_long_to_districts,
                              lat_long_to_polygon)
from model.search_assemble import assemble_search
from model.slide_carousel import generate_slides
from model.loyalty import get_loyalty

import model.download_excel
import model.stash_cart
import model.party_data
import model.log_quota

# Turn this off on production:
if config["server"]:
    bottle.debug(True)
else:
    bottle.debug(False)

# Setup
app = bottle.Bottle()
bottle.BaseTemplate.defaults['get_url'] = app.get_url
bottle.BaseTemplate.defaults['template'] = bottle.template
bottle.TEMPLATE_PATH.append('/static/bookreader')
bottle.TEMPLATE_PATH.append('/static/bookreader/BookReader')

# Debug timing to improve speed
time_labels = []
time_nums = []


def clear_time():
    """ Clear debug timings for the page load. """
    global time_labels, time_nums

    time_labels = []
    time_nums = []


def time_it(label):
    """ Add an additional debug timing to the page load. """
    global time_labels, time_nums

    time_labels.append(label)
    time_nums.append(time.time())


def zip_times():
    """ Calculate the time diffs for each step and return. """
    global time_labels, time_nums

    time_nums_diff = [0] + [time_nums[i + 1] - time_nums[i]
                            for i in range(len(time_nums) - 1)]

    return list(zip(time_labels, time_nums_diff))


def get_base(urlparts):
    """ Extracts the base domain URL for the site. """
    domain = urlparts.scheme + "://" + urlparts.netloc + "/"
    return domain


def default_value(input_var, value=None):
    """ Helper function for handling bottle arguments and setting defaults """
    return input_var if input_var else value


#
# Web pages
#
@app.route('/static/<path:path>')
def callback(path):
    """
    Pass through static content -- nginx should handle this, but if it doesn't,
    bottle will
    """

    return bottle.static_file(path, "./static")


@app.route("/")
@app.route("/search/")
@app.route("/search/<search_string>")
def index(search_string=""):
    """ Generates main index vote and search page. """
    clear_time()
    time_it("begin")

    base_url = get_base(bottle.request.urlparts)

    try:
        arg_dict = {}
        for k, v in bottle.request.params.items():
            arg_dict[k] = v
    except Exception:
        pass

    time_it("assembleArgs")

    try:
        if "fromDate" in arg_dict:
            arg_dict["fromDate"] = arg_dict["fromDate"].replace("/", "-")
            arg_dict["fromDate"] = re.sub(
                r"[^0-9\-\ ]", "", arg_dict["fromDate"])
        if "toDate" in arg_dict:
            arg_dict["toDate"] = arg_dict["toDate"].replace("/", "-")
            arg_dict["toDate"] = re.sub(r"[^0-9\-\ ]", "", arg_dict["toDate"])
        if "fromCongress" in arg_dict:
            arg_dict["fromCongress"] = int(arg_dict["fromCongress"])
        if "toCongress" in arg_dict:
            arg_dict["toCongress"] = int(arg_dict["toCongress"])
        if "support" in arg_dict and "," in arg_dict["support"]:
            try:
                arg_dict["supportMin"], arg_dict["supportMax"] = [
                    int(x) for x in arg_dict["support"].split(",")]
            except Exception:
                pass
        elif "support" in arg_dict:
            try:
                support = int(arg_dict["support"])
                arg_dict["supportMin"] = support - 1
                arg_dict["supportMax"] = support + 1
            except Exception:
                pass
        time_it("doneAssembly")

        # Randomly sample some slides to show.
        slides = generate_slides()
        output = bottle.template("views/search",
                                 args=arg_dict, search_string=search_string,
                                 time_set=zip_times(), base_url=base_url,
                                 slides=slides)
    except Exception:
        output = bottle.template(
            "views/error", error_message=traceback.format_exc())
        # error_message="Error: One or more of the parameters you used to call
        # this page was misspecified.")

    return output

# Static Pages with no arguments, just passthrough the template.
# Really we should just cache these, but anyway.


@app.route("/about")
def about():
    """ Simple passthrough to about page. """
    output = bottle.template('views/about')
    return output


@app.route("/quota")
@app.route("/abuse")
def quota():
    """ Simple passthrough to quota expired page. """
    output = bottle.template("views/quota")
    return output


@app.route("/data")
def data():
    """ Load the data page -- need to populate the maximum congress. """
    max_congress = config["max_congress"]
    data_articles = list_articles("data")
    current_year = datetime.datetime.now().year
    output = bottle.template("views/data",
                             max_congress=max_congress,
                             articles=data_articles,
                             year=current_year)
    return output


@app.route("/past_data")
def past_data():
    """ Index page listing past full database zips. """
    blacklist = [".gitkeep"]
    folder_files = [x for x in reversed(sorted(os.listdir("static/db/"))) if
                    x not in blacklist]
    return bottle.template("views/past_data", folder_files=folder_files)

# Pages that have arguments
@app.route("/congress")
@app.route("/congress/<chamber:re:house|senate>")
@app.route("/congress/<chamber:re:house|senate>/<congress_num:int>")
@app.route("/congress/<chamber:re:house|senate>/<congress_num:int>/<tv>")
@app.route("/congress/<chamber:re:house|senate>/<tabular_view>")
def display_congress(chamber="senate", congress_num=-1, tabular_view=""):
    """ View a given congress """
    max_congress = config["max_congress"]

    # Constrain chamber to senate/house
    if chamber != "senate":
        chamber = "house"

    # Argument order weirdness in bottle: try to combine chamber/text
    if tabular_view != "text" and tabular_view:
        try:
            congress_num = int(tabular_view)
            tabular_view = ""
        except Exception:
            tabular_view = ""
            congress_num = max_congress

    # Hack to ensure 116th shows because senate hasn't voted yet.
    if congress_num == -1 and chamber == "senate":
        congress_num = 116

    # Get meta args for NOMINATE
    meta = meta_lookup()

    member_label = ("Senators" if chamber.title() == "Senate"
                    else "Representatives")

    output = bottle.template("views/congress",
                             chamber=chamber,
                             congress=congress_num,
                             max_congress=max_congress,
                             dimweight=meta["nominate"]["second_dimweight"],
                             nom_beta=meta["nominate"]["beta"],
                             tabular_view=tabular_view,
                             member_label=member_label)
    return output


@app.route("/district")
@app.route("/district/<search>")
def district(search_text=""):
    """ Show the district lookup page. """
    meta = meta_lookup()
    output = bottle.template("views/district", search=search_text,
                             dimweight=meta["nominate"]["second_dimweight"],
                             nom_beta=meta["nominate"]["beta"])
    return output


@app.route("/parties")
@app.route("/parties/<party>/<congStart>")
@app.route("/parties/<party>")
def parties(party="all", cong_start=-1):
    """ Show the parties at a glance or party page. """
    max_congress = config["max_congress"]

    if isinstance(cong_start, str):
        cong_start = -1

    # Just default for now
    try:
        party = int(party)
    except Exception:
        output = bottle.template("views/parties_glance",
                                 max_congress=max_congress)
        return output

    if cong_start == -1:
        cong_start = int(max_congress)
    else:
        try:
            cong_start = int(cong_start)
        except Exception:
            cong_start = 0

    # Try to clamp invalid party IDs
    if party > 8000:
        party = 200

    party_data = model.party_data.get_party_data(party)

    output = bottle.template("views/parties", party=party,
                             party_data=party_data,
                             party_name_full=party_data["fullName"],
                             cong_start=cong_start)
    return output


@app.route("/api/getloyalty")
def getloyalty(party_code="", cong_number=""):
    """ Get party loyalty for a given party-congress. """
    party_code = default_value(bottle.request.params.party_code, party_code)
    cong_number = default_value(bottle.request.params.congress, cong_number)
    return get_loyalty(party_code, cong_number)


@app.route("/articles/<slug>")
def display_article(slug=""):
    """ Display a blog article. """
    if (not slug or not os.path.isfile(
            os.path.join("static/articles", slug, slug + ".json"))):
        return bottle.template(
            "views/error",
            error_message=(
                "The article you selected is not a valid article ID."))

    meta_set = get_article_meta(slug)
    if not meta_set:
        meta_set = {"title": "test"}
    output = bottle.template("views/articles", slug=slug, meta=meta_set)
    return output


@app.route("/person")
@app.route("/person/<icpsr>")
@app.route("/person/<icpsr>/<garbage>")
def person(icpsr=0, garbage=""):
    """ Display a congressperson's bio page. """
    del garbage  # Truthfully this is a hack
    clear_time()
    time_it("begin")
    if not icpsr:
        icpsr = default_value(bottle.request.params.icpsr, 0)

    # Easter Egg
    keith = default_value(bottle.request.params.keith, 0)

    # Pull member by ICPSR
    person_response = member_lookup({"icpsr": icpsr}, 1)
    time_it("memberLookup")

    if "errormessage" in person_response:
        output = bottle.template(
            "views/error", error_message=person_response["errormessage"])
        return output

    # Extract the actual result.
    person_extracted = person_response["results"][0]

    # Assemble data
    person_extracted = assemble_person_meta(person_extracted, keith)
    twitter_card_result = twitter_card(person_extracted)

    # Go to the template.
    output = bottle.template("views/person", person=person_extracted,
                             time_set=zip_times(), skip=0,
                             twitter_card=twitter_card_result)
    return output


def count_images(publication, file_number):
    """Return the number of scans in the directory."""
    format_string = 'static/img/scans/{}/{:>03}/*'
    glob_string = format_string.format(publication, file_number)
    image_paths = glob.glob(glob_string)
    return len(image_paths)


@app.route('/source_images/<publication>/BookReader')
@app.route('/source_images/<publication>/<file_number>/<page_number>',
           name='source_images')
def source_images(publication, file_number, page_number, **kwargs):
    """ Book reader image fetcher. """

    del kwargs
    return bottle.template(
        'views/source_images',
        publication=publication,
        file_number=file_number,
        page_number=page_number,
        num_leafs=count_images(publication, file_number),
    )


def mark_linkable_sources(sources):
    """ Which sources are linkable. """

    publications_currently_linkable = ['House Journal', ]
    new_sources = []
    for source in sources:
        new = source.copy()
        new['is_linkable'] = source[
            'publication'] in publications_currently_linkable
        new_sources.append(new)
    return new_sources


@app.route("/rollcall")
@app.route("/rollcall/<rollcall_id>")
def display_rollcall(rollcall_id=""):
    """ Display a single rollcall. """
    # Error handling: User did not specify valid query parameters.
    if not rollcall_id:
        return bottle.template(
            "views/error",
            error_message="You did not provide a rollcall ID."
        )
    elif "," in rollcall_id:
        return bottle.template(
            "views/error",
            error_message="You may only view one rollcall ID at a time."
        )

    # Get the rollcall and also whether or not to collapse minor parties.
    rollcall = model.download_votes.download_votes_api(rollcall_id, "Web")
    map_parties = int(default_value(bottle.request.params.map_parties, 1))

    # After we got the rollcall, we found it didn't exist.
    if "rollcalls" not in rollcall or "errormessage" in rollcall:
        return bottle.template(
            "views/error",
            error_message=rollcall["errormessage"])

    # Get NOMINATE params
    meta = meta_lookup()

    # Get sponsor info.
    sponsor = {}
    if "rollcalls" in rollcall and "sponsor" in rollcall["rollcalls"][0]:
        try:
            sponsor = [x for x in rollcall["rollcalls"][0]["votes"]
                       if x["icpsr"] == rollcall["rollcalls"][0]["sponsor"]][0]
        except Exception:
            sponsor = {}

    # Subset the rollcall to the stuff we care about.
    current_rollcall = rollcall["rollcalls"][0]

    # Make derived quantities we care about.
    def suffix_gen(n):
        """ Helper to quickly convert number n -> ordinal suffix nth """
        subscript = (n / 10 % 10 != 1) * (n % 10 < 4) * n % 10
        return "%d%s" % (n, "tsnrhtdd"[subscript::4])

    plot_title = "Plot Vote: %s Congress > %s > %s" % (
        suffix_gen(current_rollcall["congress"]),
        current_rollcall["chamber"],
        current_rollcall["rollnumber"])

    notes = []
    if int(current_rollcall["congress"]) < 86:
        notes.append("State Boundaries depicted are as of the %s Congress." %
                     suffix_gen(current_rollcall["congress"]))

    if (int(current_rollcall["congress"]) < 91 and
            current_rollcall["chamber"] == "House"):
        notes.append("Some states contain At-Large districts with more than "
                     "one representative.")

    note_text = (("<strong><u>NOTE</u></strong><br/><ul>%s</ul>" %
                  " ".join(["<li>%s</li>" % note for note in notes]) + "</ul>")
                 if notes else "")

    # Bill title text
    titles = (current_rollcall.get('cg_official_titles', []) +
              current_rollcall.get('cg_short_titles_for_portions', []))

    if titles:
        title_text = "; ".join(title.encode("utf-8") for title in titles)
    else:
        title_text = ""

    # Display template.
    output = bottle.template(
        "views/vote",
        rollcall=current_rollcall,
        dimweight=meta["nominate"]["second_dimweight"],
        nom_beta=meta["nominate"]["beta"],
        map_parties=map_parties,
        sponsor=sponsor,
        sources=mark_linkable_sources(current_rollcall.get("dtl_sources", [])),
        note_text=note_text,
        title_text=title_text,
        plot_title=plot_title
    )
    return output


# Stash saved links redirect
@app.route("/s/<savedhash>")
def saved_hash_redirect(savedhash):
    """ Redirect from a clean URL to a saved hash redirect. """
    error_invalid = (
        "Invalid redirect ID. This link is not valid. Please notify the person"
        " who provided this link to you that it is not operational.")

    if not savedhash:
        return bottle.template("views/error", error_message=error_invalid)

    status = model.stash_cart.check_exists(savedhash.strip())["status"]
    if status:
        return bottle.template("views/error", error_message=error_invalid)

    bottle.redirect("/search/?q=saved: %s" % savedhash)
    return {}

#
#
# API methods
#
#
@app.route("/api/getmembersbycongress", method="POST")
@app.route("/api/getmembersbycongress")
def getmembersbycongress():
    """ Get all the members of the current congress. """
    start_time = time.time()
    which_congress = default_value(bottle.request.params.congress, 0)
    chamber = default_value(bottle.request.params.chamber, "").title()
    if chamber != "Senate" and chamber != "House":
        chamber = ""
    api = default_value(bottle.request.params.api, "")
    out = get_members_by_congress(which_congress, chamber, api)
    if api == "Web_Congress" and "results" in out:
        for i in range(0, len(out["results"])):
            member_row = out["results"][i]
            if "congresses" not in member_row:
                continue

            member_row["minElected"] = congress_to_year(
                member_row["congresses"][0][0], 0)

            out["results"][i] = member_row

    out["timeElapsed"] = time.time() - start_time
    return out


@app.route("/api/geocode")
def geocode():
    """ Geocode a query parameter. """

    geo_query = default_value(bottle.request.params.q, "")
    if not geo_query:
        return {"status": 1, "error_message": "No address specified."}

    return address_to_lat_long(bottle.request, geo_query)


@app.route("/api/districtPolygonLookup")
def lookup_district_polygon():
    """ Converts a latitude-longtiude pair to district polygon. """
    try:
        latitude = float(default_value(bottle.request.params.lat, 0))
        longitude = float(default_value(bottle.request.params.long, 0))
    except Exception:
        return {"status": 1, "error_message": "Invalid lat/long coordinates."}

    current_congress_polygon = lat_long_to_polygon(bottle.request,
                                                   latitude,
                                                   longitude)

    if current_congress_polygon:
        return {"polygon": current_congress_polygon}

    return {"polygon": []}


@app.route("/api/districtLookup")
def district_lookup():
    """ Convert a latitude-longitude pair to district information. """
    try:
        latitude = float(default_value(bottle.request.params.lat, 0))
        longitude = float(default_value(bottle.request.params.long, 0))
    except Exception:
        return {"status": 1, "error_message": "Invalid lat/long coordinates."}

    results = lat_long_to_districts(bottle.request, latitude, longitude)
    if isinstance(results, dict) and "status" in results:  # Quota error.
        return results

    if "results" not in results or not results["results"]:
        return {"status": 1, "error_message": "No matches."}

    return district_member_lookups(results)


@app.route("/api/getmembersbyparty")
def getmembersbyparty():
    """ Get all the members of a current party. """

    start_time = time.time()
    member_id = default_value(bottle.request.params.id, 0)
    try:
        congress = int(default_value(bottle.request.params.congress, 0))
    except Exception:
        congress = 0
    api = default_value(bottle.request.params.api, "")
    out = get_members_by_party(member_id, congress, api)
    if api == "Web_Party" and "results" in out:
        for i in range(0, len(out["results"])):
            member_row = out["results"][i]
            if "congresses" not in member_row:
                continue

            member_row["minElected"] = congress_to_year(
                member_row["congresses"][0][0], 0)
            out["results"][i] = member_row

    out["timeElapsed"] = time.time() - start_time
    return out


@app.route("/api/getmembers", method="POST")
@app.route("/api/getmembers")
def getmembers():
    """ Get all members matching a query. """
    qdict = {}

    distinct = 0
    api = "Web"

    # Transparently pass through the entire query dictionary
    for key, value in bottle.request.params.items():
        if key == 'distinct':
            distinct = int(default_value(value, 0))
        elif key == 'api':
            api = default_value(value, "Web")
        else:
            qdict[key] = default_value(value)

    return member_lookup(qdict, distinct=distinct, api=api)


@app.route("/api/searchAssemble", method="POST")
@app.route("/api/searchAssemble")
def api_assemble_search():
    """ Assemble a full search query. """
    search_query = default_value(bottle.request.params.q)
    next_id = default_value(bottle.request.params.nextId, 0)

    out = assemble_search(search_query, next_id, bottle)
    return out


@app.route("/api/getMemberVotesAssemble")
def assemble_member_votes(icpsr=0, qtext="", skip=0):
    """ Assembles a member's votes. """
    icpsr = default_value(bottle.request.params.icpsr, 0)
    qtext = default_value(bottle.request.params.qtext, "")
    skip = default_value(bottle.request.params.skip, 0)

    if not icpsr:
        output = bottle.template(
            "views/error", error_message="No member specified.")
        bottle.response.headers["nextId"] = 0
        return output

    person_response = member_lookup({"icpsr": icpsr})
    if "error" not in person_response:
        person_extracted = person_response["results"][0]
    else:
        output = bottle.template(
            "views/error", error_message=person_response["errormessage"])
        bottle.response.headers["nextId"] = 0

    votes = []

    if qtext:
        qtext = qtext + " AND (voter: " + str(person_extracted["icpsr"]) + ")"
    else:
        qtext = "voter: " + str(person_extracted["icpsr"])

    if skip:
        vote_query = query(qtext, row_limit=25, jsapi=1,
                           sort_skip=skip, request=bottle.request)
    else:
        vote_query = query(qtext, row_limit=25, jsapi=1,
                           request=bottle.request)

    # Outsourced the vote assembly to a model for future API buildout.
    votes = prep_votes(vote_query, person_extracted)
    output = bottle.template(
        "views/member_votes", person=person_extracted, votes=votes,
        skip=skip, next_id=vote_query["next_id"])

    bottle.response.headers["nextId"] = vote_query["next_id"]
    return output


@app.route("/api/search", method="POST")
@app.route("/api/search")
def search():
    """ Executes an API search for votes and members. """
    search_query = default_value(bottle.request.params.q)
    startdate = default_value(bottle.request.params.startdate)
    enddate = default_value(bottle.request.params.enddate)
    chamber = default_value(bottle.request.params.chamber)
    icpsr = default_value(bottle.request.params.icpsr)
    rapi = default_value(bottle.request.params.rapi, 0)
    res = query(search_query, startdate, enddate, chamber, icpsr=icpsr,
                rapi=rapi, request=bottle.request)
    return res


@app.route("/api/getPartyData", method="POST")
@app.route("/api/getPartyData")
def get_party_name():
    """ Return party data by ID. """
    party_id = default_value(bottle.request.params.id)
    return model.party_data.get_party_data(party_id)


@app.route("/api/download", method="POST")
@app.route("/api/download")
@app.route("/api/download/<rollcall_id>")
def download_votes(rollcall_id=""):
    """ Downloads rollcall vote or votes. """
    if not rollcall_id:
        rollcall_id = default_value(bottle.request.params.rollcall_id)
    apitype = default_value(bottle.request.params.apitype, "Web")
    results = model.download_votes.download_votes_api(rollcall_id, apitype)
    return results


@app.route("/api/exportJSON", method="POST")
@app.route("/api/exportJSON")
def stash_export_json():
    """ Exports current stash as JSON. """
    stash_id = default_value(bottle.request.params.id, "")
    return model.download_votes.download_stash(stash_id)


@app.route("/api/downloadXLS", method="POST")
@app.route("/api/downloadXLS")
def download_excel():
    """ Download Excel file of votes. """
    try:
        stash_id = default_value(bottle.request.params.stash, "")
    except Exception:
        stash_id = ""

    try:
        ids = bottle.request.params.getall("ids")
    except Exception:
        ids = []

    try:
        if isinstance(ids, list):
            ids = ",".join(ids)
    except Exception:
        pass

    if stash_id:
        status_code, result = model.download_excel.download_stash(stash_id)
    else:
        status_code, result = model.download_excel.download_excel(ids)

    if status_code != 0:
        return {"errormessage": result}

    bottle.response.content_type = 'application/vnd.ms-excel'
    current_date_string = datetime.datetime.now().strftime("%Y%m%d_%H%M")
    output_filename = current_date_string + "_voteview_download.xls"
    bottle.response.headers["Content-Disposition"] = "inline; filename=%s" % (
        output_filename)
    return result


@app.route("/api/newsletter", method="POST")
@app.route("/api/newsletter")
def newsletter():
    """ Subscribe to newsletter. """
    try:
        email = bottle.request.params.update_email
        update_action = bottle.request.params.update_action
        res = newsletter_subscribe(email, update_action)
        return res
    except Exception:
        return {"error": (
            "An unknown error occurred while processing your request.")}


@app.route("/api/contact", method="POST")
@app.route("/api/contact")
def contact():
    """ Send a contact email. """

    # pylint: disable=E1136
    try:
        title = bottle.request.params.title
        body = bottle.request.params.body
        email = bottle.request.params.email
        person_name = bottle.request.params.yourname
        recaptcha = bottle.request.params["g-recaptcha-response"]
        ip_address = bottle.request.get("REMOTE_ADDR")
        res = send_email(title=title,
                         body=body,
                         person_name=person_name,
                         email=email,
                         recaptcha=recaptcha,
                         client_ip=ip_address,
                         test=0)
        return res
    except Exception:
        return {"error": (
            "You must fill out the entire form before submitting.")}


@app.route("/api/stash/<verb:re:init|add|del|get|empty>")
def stash(verb):
    """ Dispatch tasks to stash; add, delete, get, empty, etc. """
    try:
        stash_id = default_value(bottle.request.params.id, "")
        votes = bottle.request.params.getall("votes")
    except Exception:
        votes = []

    return model.stash_cart.verb_dispatch(verb, stash_id, votes)


@app.route("/api/shareableLink")
@app.route("/api/shareableLink", method="POST")
def stash_share_link():
    """ Generate a shareable link for a given stash ID. """
    try:
        base_url = get_base(bottle.request.urlparts)
        share_id = default_value(bottle.request.params.id, "")
        text = default_value(bottle.request.params.text, "")
    except Exception:
        return {"errorMessage": "Invalid ID or text"}

    return model.stash_cart.shareable_link(share_id, text, base_url=base_url)


@app.route("/api/downloaddata", method="POST")
@app.route("/api/downloaddata")
def download_data():
    """ Returns a particular data file. """

    try:
        base_url = get_base(bottle.request.urlparts)
        data_type = default_value(bottle.request.params.datType, "")
        unit = default_value(bottle.request.params.type,
                             None if data_type == "ord" else "")
        chamber = default_value(bottle.request.params.chamber,
                                None if unit == "party" else "both")
        congress_number = default_value(bottle.request.params.congress, "all")
    except Exception:
        return {"errorMessage": "Invalid query"}

    if data_type == "" or unit == "":
        return {"errorMessage": "Either type or unit specified incorrectly."}

    static_url = base_url + "static/data/out/" + unit + "/"

    if chamber == "house":
        chamberlet = "H"
    elif chamber == "senate":
        chamberlet = "S"
    elif chamber == "both":
        chamberlet = "HS"
    else:
        return {"errorMessage": chamber + " is an invalid `chamber`"}

    return {
        "file_url": "%s%s%s_%s.%s" %
                    (static_url, chamberlet, congress_number, unit, data_type)}


@app.route("/api/addAll")
@app.route("/api/addAll", method="POST")
def stash_add_all():
    """ Add a series of votes to stash cart. """
    try:
        add_id = default_value(bottle.request.params.id, "")
        add_search = default_value(bottle.request.params.search, "")
    except Exception:
        return {"errorMessage": "Invalid ID or search."}
    return model.stash_cart.add_all(add_id, add_search)


@app.route("/api/delAll")
@app.route("/api/delAll", method="POST")
def delete_all():
    """ Delete everything from a stash cart. """
    try:
        delete_id = default_value(bottle.request.params.id, "")
        delete_search = default_value(bottle.request.params.search, "")
    except Exception:
        return {"errorMessage": "Invalid ID or search."}
    return model.stash_cart.delete_all(delete_id, delete_search)


@app.route("/api/setSearch")
@app.route("/api/setSearch", method="POST")
def stash_set_search():
    """ API endpoint for updating most recent search. """

    try:
        search_id = default_value(bottle.request.params.id, "")
        search_text = default_value(bottle.request.params.search, "")
    except Exception:
        return {"errorMessage": "Invalid ID or search"}

    return model.stash_cart.set_search(search_id, search_text)


@app.route("/outdated")
def outdate():
    """ Outdated browser warning, not currently enabled. """
    return bottle.template("views/outdated")


@app.route("/api/version")
def api_version():
    """ Returns current code / API date and quota information. """
    return(
        {'apiversion': 'Q2 Nov 01, 2019',
         'request_hash': model.log_quota.generate_session_id(bottle.request),
         'quota_credits': model.log_quota.get_credits(bottle.request)})


if __name__ == '__main__':
    print("Running local server for test purposes...")
    bottle.run(app, host='localhost', port=8080, debug=True, reloader=True)
