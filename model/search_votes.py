""" Handles the human query -> MongoDB query steps. """

from __future__ import print_function
from datetime import date
import sys
import traceback
import time
import pymongo
import model.log_quota
import model.query_parser
from model.date_helper import fix_date
from model.download_votes import waterfall_text, waterfall_question
from model.config import config

client = pymongo.MongoClient(host=config["db_host"], port=config["db_port"])
db = client[config["db_name"]]

SCORE_THRESHOLD = (config["auth"]["scoreThreshold"]
                   if "scoreThreshold" in config["auth"]
                   else 0.75)
SCORE_MULT_THRESHOLD = (config["auth"]["scoreMultThreshold"]
                        if "scoreMultThreshold" in config["auth"]
                        else 0.5)


def query(qtext, startdate=None, enddate=None, chamber=None,
          flds=["id", "Issue", "Peltzman", "Clausen", "description",
                "descriptionLiteral", "descriptionShort",
                "descriptionShortLiteral"],
          icpsr=None, row_limit=5000, jsapi=0, rapi=0, sort_dir=-1,
          sort_skip=0, sort_score=1, sort_rollcalls=0, ids_only=0,
          request=None):
    """
    Takes the query, deals with any of the custom parameters coming in from
    the R package, and then dispatches freeform text queries to the query
    dispatcher.

    Parameters
    ----------
    qtext : str
        Custom query string.
    startdate: str
        Format YYYY-MM-DD
    enddate: str
        Format YYYY-MM-DD
    chamber: str
        Valid choices are Senate or House
        Error handling will change S to Senate or H to House
    flds: list
        List of fields it wants returned? Parameter is deprecated
    icpsr: int
        Taking ICPSR number as possible argument to directly passthrough the
        person's votes.
    jsapi: int
        Is this an API call from the Javascript API?
        We do this to determine whether we should be returning paginated data
        or returning as much as we can and erroring if the row_limit is
        violated.
    sort_dir: int
        Sort by date reversed or sort by date ascending
    sort_skip: int
        Pagination is slow as hell in MongoDB, so we can take a maximum ID to
        make mock pagination. Then, we should return a "next_id" parameter for
        the next page.
    request: Bottle.request Object
        Passes user request details to the log/quota module; if none, assume
        command line.

    Returns
    -------
    dict
        Dict of results to be run through json.dumps for later output
    """

    # Are we over quota?
    quota_check = model.log_quota.check_quota(request)
    # Yes, so error out
    if quota_check["status"]:
        return {"recordcount": 0,
                "rollcalls": [],
                "errormessage": quota_check["errormessage"]}

    if not qtext:
        qtext = ""
    base_row_limit = row_limit

    print(qtext)
    begin_time = time.time()
    global db
    query_dict = {}
    need_score = 0
    # Process the date
    if (startdate is None and enddate is None and chamber is None and
            qtext is None and not jsapi):
        # Add to quota.
        model.log_quota.add_quota(request, 1)
        # Log the failed search: No search
        model.log_quota.log_search(request, {"query": "", "resultNum": -1})
        # Return the regular error.
        return {'recordcount': 0,
                'rollcalls': [],
                'errormessage': "No query specified."}

    if startdate is not None or enddate is not None:
        nextyear = str(date.today().year + 1)
        if startdate or enddate:
            query_dict["date"] = {}
        if startdate:
            if startdate < "1787-01-01":
                query_dict["date"]["$gte"] = "1787-01-01"
            else:
                query_dict["date"]["$gte"] = startdate
        if enddate:
            if enddate > nextyear + "-01-01":
                query_dict["date"]["$lte"] = nextyear+"-01-01"
            else:
                query_dict["date"]["$lte"] = enddate
        if startdate and enddate and startdate > enddate:
            # Add to quota
            model.log_quota.add_quota(request, 1)
            # Log the failed search: No search
            model.log_quota.log_search(request, {"query": "Invalid query: Start date after end date.", "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "Start Date should be on or before End Date"}

    # Process the chamber
    if chamber is not None:
        chamber = chamber.title()
        if chamber == "S":
            chamber = "Senate"
        elif chamber == "H":
            chamber = "House"
        if chamber not in ["House", "Senate"]:
            # Add to quota
            model.log_quota.add_quota(request, 1)
            # Log the failed search: no search
            model.log_quota.log_search(request, {"query": "Invalid query: Invalid chamber", "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "Invalid chamber entered. Chamber can be \"House\" or \"Senate\"."}

        query_dict["chamber"] = chamber

    if qtext:
        if not isinstance(qtext, str):
            try:
                try:
                    from urllib import unquote_plus
                except Exception:
                    from urllib.parse import unquote_plus
                qtext = unquote_plus(qtext)
            except Exception:
                print(traceback.format_exc())
                model.log_quota.add_quota(request, 1)
                model.log_quota.log_search(request, {"query": "Invalid query: Character encoding error?", "query_extra": qtext, "resultNum": -1})
                return {'recordcount': 0, 'rollcalls': [], 'errormessage': 'Error resolving query string.'}

        word_set = [x.lower() for x in qtext.split()]
        if all([w.lower() in config["stop_words"] for w in word_set]):
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query: All words on stoplist.", "query_extra": qtext, "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "All the words you searched for are too common. Please be more specific with your search query."}

        if len(qtext) > 2500:
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query: Too long.", "query_extra": qtext, "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "Query is too long. Please shorten query length."}

        try:
            newquery_dict, need_score, error_message = model.query_parser.query_dispatcher(qtext)
            if error_message:
                print("Error parsing the query\n%s" % error_message)
                model.log_quota.add_quota(request, 1)
                model.log_quota.log_search(request, {"query": "Invalid Query; parsing issue.", "query_extra": qtext, "resultNum": -1})
                return {'recordcount': 0, 'rollcalls': [], 'errormessage': error_message}
        except Exception as e:
            print(traceback.format_exc())
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query; parsing issue.", "query_extra": qtext, "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "Error parsing freeform query. We are working on building out query debug messages to provide better feedback.", 'detailederror': traceback.format_exc(), 'q': qtext}

        try:
            z = query_dict.copy()
            z.update(newquery_dict)
            query_dict = z
        except Exception:
            pass

    if icpsr is not None:
        query_dict["votes.id"] = icpsr

    # Get results
    if not ids_only:
        field_returns = {
            "codes.Clausen": 1, "codes.Peltzman": 1, "codes.Issue": 1,
            "description": 1, "congress": 1, "rollnumber": 1, "date": 1,
            "bill": 1, "chamber": 1, "yea_count": 1, "nay_count": 1,
            "percent_support": 1, "vote_counts": 1, "_id": 0, "id": 1,
            "date_chamber_rollnumber": 1, "key_flags": 1, "vote_desc": 1,
            "vote_document_text": 1, "short_description": 1,
            "vote_question": 1, "question": 1, "vote_result": 1,
            'vote_title': 1, 'vote_question_text': 1, 'amendment_author': 1,
            "vote_description": 1, "bill_number": 1, "sponsor": 1}
    else:
        field_returns = {"id": 1, "_id": 0, "date_chamber_rollnumber": 1}

    if need_score:
        field_returns["score"] = {"$meta": "textScore"}

    votes = db.voteview_rollcalls
    try:
        sort_skip = int(sort_skip)
    except Exception:
        sort_skip = 0

    if sort_skip and not need_score:
        if sort_dir == -1:
            query_dict["date_chamber_rollnumber"] = {"$lt": sort_skip}
        else:
            query_dict["date_chamber_rollnumber"] = {"$gt": sort_skip}

    print(query_dict)
    # Need to sort by text score
    if need_score:
        try:

            result_count = votes.count_documents(query_dict)
            row_limit = base_row_limit
            if not jsapi:
                results = votes.find(query_dict, field_returns).limit(row_limit + 5)
            else:
                if sort_score:
                    results = (votes.find(query_dict, field_returns)
                               .sort([("score", {"$meta": "textScore"})])
                               .skip(sort_skip)
                               .limit(row_limit + 5))
                else:
                    results = (votes.find(query_dict, field_returns)
                               .sort("date_chamber_rollnumber", sort_dir)
                               .skip(sort_skip)
                               .limit(row_limit + 5))
        except pymongo.errors.OperationFailure as e:
            try:
                mongo_error = e.message
                if "many text expressions" in mongo_error:
                    model.log_quota.add_quota(request, 1)
                    model.log_quota.log_search(request, {"query": "Invalid Query: Multiple full-text.", "query_extra": query_dict, "resultNum": -1})
                    return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Search queries are limited to one full-text search. Please use quotation marks to search for exact matches or simplify search query.'}

                model.log_quota.add_quota(request, 1)
                model.log_quota.log_search(request, {"query": "Invalid Query: Unknown error", "query_extra": query_dict, "resultNum": -1})
                return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Error during database query. Detailed error: '+mongo_error}
            except Exception:
                print(traceback.format_exc())
                model.log_quota.add_quota(request, 1)
                model.log_quota.log_search(request, {"query": "Invalid Query: Unknown error.", "query_extra": query_dict, "resultNum": -1})
                return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Unknown error during database query. Please check query syntax and try again.'}
        except Exception:
            print(traceback.format_exc())
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query: Unknown error.", "query_extra": query_dict, "resultNum": -1})
            return_dict = {"rollcalls": [], "recordcount": 0, "errormessage": "Invalid query."}
            return return_dict
    else:
        try:
            result_count = votes.count_documents(query_dict)
            row_limit = base_row_limit
            if not jsapi:
                results = votes.find(query_dict, field_returns).limit(row_limit + 5)
            else:
                sort_by = "date_chamber_rollnumber" if not sort_rollcalls else "rollnumber"
                results = votes.find(query_dict, field_returns).sort(sort_by, sort_dir).limit(row_limit + 5)
        except pymongo.errors.OperationFailure as e:
            try:
                _, mongo_error = e.message.split("failed: ")
                model.log_quota.add_quota(request, 1)
                model.log_quota.log_search(request, {"query": "Invalid Query: Unknown error: " + mongo_error, "query_extra": query_dict, "resultNum": -1})
                return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Error during database query. Detailed error: '+mongo_error}
            except Exception:
                model.log_quota.add_quota(request, 1)
                model.log_quota.log_search(request, {"query": "Invalid Query: Unknown error.", "query_extra": query_dict, "resultNum": -1})
                return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Unknown error during database query. Please check query syntax and try again.'}
        except Exception:
            print(traceback.format_exc())
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query: Unknown error", "query_extra": query_dict, "resultNum": -1})
            return_dict = {"rollcalls": [], "recordcount": 0, "errormessage": "Invalid query."}
            return return_dict

    # Mongo lazy-allocates results, so we need to loop to pull them in
    mr = []
    next_id = 0
    max_score = 0
    for res in results:
        # Apply waterfall to text if jsapi
        if jsapi or rapi:
            res["text"] = waterfall_text(res)
            res["question"] = waterfall_question(res)

        if not max_score and need_score and res["score"] >= max_score:
            max_score = res["score"]

        if "date" in res:
            res["date_user"] = fix_date(res["date"])

        if len(mr) < row_limit:
            if "date_chamber_rollnumber" in res:
                del res["date_chamber_rollnumber"]
            if not need_score:
                mr.append(res)
            elif (res["score"] >= SCORE_THRESHOLD and
                  res["score"] >= SCORE_MULT_THRESHOLD * max_score):
                mr.append(res)
            else:
                next_id = 0
                break
        else:
            if not need_score:
                next_id = str(res["date_chamber_rollnumber"])
            else:
                next_id = sort_skip + row_limit
            break

    if need_score:
        key_vote_boost = 2
        mr.sort(key=lambda x: -x["score"] - key_vote_boost * int(bool(x.get("key_flags", []))))

    # Get ready to output
    return_dict = {}
    return_dict["need_score"] = need_score
    return_dict["rollcalls"] = mr
    return_dict["recordcount"] = len(mr)
    return_dict["recordcountTotal"] = result_count
    return_dict["apiversion"] = "Q3 2017-01-08"
    return_dict["next_id"] = next_id
    if "$text" in query_dict:
        return_dict["fulltextSearch"] = [v for _, v in query_dict["$text"].items()][0]

    if result_count > row_limit:
        return_dict["rollcalls"] = mr[0:row_limit]
        if not jsapi:
            return_dict["errormessage"] = "Error: Query returns more than "+("{:,d}".format(row_limit))+" results."
    end_time = time.time()
    elapsed_time = end_time - begin_time
    return_dict["elapsed_time"] = round(elapsed_time, 3)

    # Quota cost depends on execution time.
    if elapsed_time > 10:
        model.log_quota.add_quota(request, 10)
        model.log_quota.log_search(request, {"query": query_dict, "query_extra": "Very slow query", "resultNum": result_count})
    elif elapsed_time > 2:
        model.log_quota.add_quota(request, 2)
        model.log_quota.log_search(request, {"query": query_dict, "query_extra": "Slow query", "resultNum": result_count})
    else:
        model.log_quota.add_quota(request, 1)
        model.log_quota.log_search(request, {"query": query_dict, "resultNum": result_count})

    print(len(return_dict["rollcalls"]), result_count)
    return return_dict


if __name__ == "__main__":
    start = time.time()
    if len(sys.argv) > 1:
        args = " ".join(sys.argv[1:])
        print(query(args))
    else:
        # results = query("(nay:[0 to 9] OR nay:[91 to 100] OR yea:[0 to 5]) AND congress:112", row_limit=5000)
        # print results
        # results = query("saved: 3a5c69e7")
        # print results

        # results1 = query("tax", startdate = "2010")
        # results2 = query("tax startdate:2010")
        # results3 = query("tax", startdate = "2008-04-07", enddate = "2013-03-03") results4 = query("tax startdate:2008-04-07 enddate:2013-03-03 dates:[2013 to 2015]")
        # results = query("voter: MS29940114")
        # print results
        # results = query('"defense commissary"')
        # print results
        # print query("congress:113 chamber:House", ids_only = 1)
        print(query("the and"))
        # query("(((description:tax))") # Error in stage 1: Imbalanced parentheses
        # query("((((((((((description:tax) OR congress:113) OR yea:55) OR support:[50 to 100]) OR congress:111))))))") # Error in stage 1: Excessive depth
        # query("(description:tax OR congress:1))(") # Error in stage 1: Mish-mash parenthesis
        # query("OR description:tax OR") # Error in stage 2: OR at wrong part of message.
        # query("iraq war test")
        # query("\"iraq war test\"")
        # query("description:tax",startdate="1972-01-01",enddate="1973-01-01",chamber="senate")
        # query("shortdescription:Iraq congress:113", chamber = "house")
        # query("shortdescription:Iraq congress:[112 to 113]", startdate="1800-01-01", enddate="2200-01-01", chamber="house")
        # query("shortdescription:Iraq congress:112 113", chamber = "house")
        # query("estate tax congress:113")
        # query("alltext:tax")
        # query("rhodesia bonker amendment")
        # query("\"estate tax\" congress:110")
        # query("codes:energy")
        # query("congress: ")
        # query("((description: \"tax\" congress: 113) OR congress:114 OR (voter:MH085001 AND congress:112) OR congress:[55 to 58]) AND support:[58 to 100]")
        # query("((description: \"tax\" congress: 113) OR congress:114 OR (voter:MH085001 AND congress:112) OR congress:[55 to 58]) AND description:\"iraq\"")
        # query("voter: MS05269036 MS02793036 MS02393036 OR congress:[113 to ]")
        # query("iraq war")
        # query("iraq war AND congress:113")
        # query("\"estate tax\" congress:110")
        # print "ok2"
        # query("\"war on terrorism\"")
        # query('"war on terrorism" iraq')
        # query("alltext:afghanistan iraq OR codes:defense")
    end = time.time()
    print(end - start)
