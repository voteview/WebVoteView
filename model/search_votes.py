""" Handles the human query -> MongoDB Atlas Search steps. """

from __future__ import print_function
from datetime import date
import sys
import traceback
import time
import pymongo
import model.log_quota
from model.date_helper import fix_date
from model.download_votes import waterfall_text, waterfall_question
from model.config import config
from model.embedding_manager import get_embedding
from model.query_parser import query_dispatcher

client = pymongo.MongoClient(config["db_uri"])
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
          request=None, additional_filters=None, semantic_search=False):
    """
    Takes the query, deals with any of the custom parameters coming in from
    the R package, and then dispatches freeform text queries to Atlas Search.

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
    additional_filters: dict
        Additional MongoDB filters to apply (for categorical filtering)

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
    
    # Parse structured query if it contains field syntax
    structured_filters = {}
    atlas_search_text = qtext  # Default to original query
    
    if qtext and ":" in qtext:
        try:
            # Use the query parser to parse structured queries
            parsed_query, parser_need_score, error_message = query_dispatcher(qtext)
            
            if isinstance(parsed_query, int) and parsed_query == -1:
                print(f"Query parser error: {error_message}, using original query")
            else:
                # Extract text search from $text field
                if "$text" in parsed_query and "$search" in parsed_query["$text"]:
                    atlas_search_text = parsed_query["$text"]["$search"]
                    
                # Extract structured filters (everything except $text)
                for key, value in parsed_query.items():
                    if key != "$text":
                        structured_filters[key] = value
                        
                print(f"Parsed - Text: '{atlas_search_text}', Filters: {structured_filters}")
        except Exception as e:
            print(f"Query parser exception: {e}, using original query")
    
    # Build the aggregation pipeline for either text search or hybrid search
    pipeline = []
    need_score = 0

    # Build search filters for dates, chamber, etc
    match_filters = {}
    if startdate is not None:
        try:
            match_filters["date"] = {"$gte": fix_date(startdate)}
        except Exception:
            pass

    if enddate is not None:
        try:
            if "date" not in match_filters:
                match_filters["date"] = {}
            match_filters["date"]["$lte"] = fix_date(enddate)
        except Exception:
            pass

    if chamber is not None:
        if chamber.strip().lower().startswith("s"):
            match_filters["chamber"] = "Senate"
        elif chamber.strip().lower().startswith("h"):
            match_filters["chamber"] = "House"

    # Handle search query - validate first, then choose search method
    query_embedding = None
    if atlas_search_text and atlas_search_text.strip():
        # Check for common stop words that are too generic
        if atlas_search_text.lower().strip() in ["the", "a", "an", "of", "to", "for", "and", "or", "in", "on", "at", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "should", "could", "can", "may", "might", "must", "shall"]:
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query: Stop word.", "query_extra": atlas_search_text, "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "All the words you searched for are too common. Please be more specific with your search query."}

        if len(atlas_search_text) > 2500:
            model.log_quota.add_quota(request, 1)
            model.log_quota.log_search(request, {"query": "Invalid Query: Too long.", "query_extra": atlas_search_text, "resultNum": -1})
            return {'recordcount': 0, 'rollcalls': [], 'errormessage': "Query is too long. Please shorten query length."}

        # Generate embedding for the query only if semantic search is enabled
        if semantic_search:
            query_embedding = get_embedding(atlas_search_text)
        
        if query_embedding is not None and semantic_search:
            # Use hybrid search with $rankFusion
            rank_fusion_stage = {
                "$rankFusion": {
                    "input": {
                        "pipelines": {
                            "vectorPipeline": [
                                {
                                    "$vectorSearch": {
                                        "index": "vector_index",
                                        "path": "vote_desc_embedding",
                                        "queryVector": query_embedding,
                                        "numCandidates": 150,
                                        "limit": 50
                                    }
                                }
                            ],
                            "fullTextPipeline": [
                                {
                                    "$search": {
                                        "index": "atlas_search",
                                        "text": {
                                            "query": atlas_search_text,
                                            "path": ["vote_desc", "description", "short_description", 
                                                    "vote_document_text", "vote_title", "vote_question_text"]
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    "combination": {
                        "weights": {
                            "vectorPipeline": 0.4,
                            "fullTextPipeline": 0.6
                        }
                    },
                    "scoreDetails": True
                }
            }
            pipeline.append(rank_fusion_stage)
            need_score = 1
        else:
            # Default: Use regular Atlas text search only
            search_stage = {
                "$search": {
                    "index": "atlas_search",
                    "text": {
                        "query": atlas_search_text,
                        "path": ["vote_desc", "description", "short_description", 
                                "vote_document_text", "vote_title", "vote_question_text"]
                    }
                }
            }
            pipeline.append(search_stage)
            need_score = 1

    if icpsr is not None:
        match_filters["votes.id"] = icpsr

    # Add additional filters from facets (categorical filters)
    if additional_filters:
        match_filters.update(additional_filters)
        
    # Add structured filters from parsed query
    if structured_filters:
        match_filters.update(structured_filters)

    # Add match stage for filters (dates, chamber, icpsr, and categorical filters)
    if match_filters:
        pipeline.append({"$match": match_filters})

    # Add search score field - handle both hybrid and regular search
    if need_score:
        if query_embedding is not None and semantic_search:
            # For hybrid search, use scoreDetails metadata
            pipeline.append({
                "$addFields": {
                    "score": {"$meta": "scoreDetails"}
                }
            })
        else:
            # For regular text search, use searchScore
            pipeline.append({
                "$addFields": {
                    "score": {"$meta": "searchScore"}
                }
            })

    # Handle pagination with sort_skip
    try:
        sort_skip = int(sort_skip)
    except Exception:
        sort_skip = 0

    if sort_skip and not need_score:
        skip_filter = {}
        if sort_dir == -1:
            skip_filter["date_chamber_rollnumber"] = {"$lt": sort_skip}
        else:
            skip_filter["date_chamber_rollnumber"] = {"$gt": sort_skip}
        pipeline.append({"$match": skip_filter})

    # Define field projection
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
            "vote_description": 1, "bill_number": 1, "sponsor": 1
        }
    else:
        field_returns = {"id": 1, "_id": 0, "date_chamber_rollnumber": 1}

    if need_score:
        field_returns["score"] = 1

    # Add projection stage
    pipeline.append({"$project": field_returns})

    # Add sorting
    if need_score and sort_score:
        if query_embedding is not None and semantic_search:
            # For hybrid search, sort by the score.value field from scoreDetails
            pipeline.append({"$sort": {"score.value": -1}})
        else:
            # For regular text search, sort by score directly
            pipeline.append({"$sort": {"score": -1}})
    elif not need_score:
        sort_by = "date_chamber_rollnumber" if not sort_rollcalls else "rollnumber"
        pipeline.append({"$sort": {sort_by: sort_dir}})

    # Add pagination
    if jsapi and sort_skip:
        pipeline.append({"$skip": sort_skip})
    
    pipeline.append({"$limit": row_limit + 5})

    print("Atlas Search Pipeline:", pipeline)
    
    votes = db.voteview_rollcalls
    
    try:
        # Execute Atlas Search aggregation pipeline
        if pipeline:
            results = list(votes.aggregate(pipeline))
        else:
            # Fallback for non-text queries
            results = list(votes.find(match_filters, field_returns).limit(row_limit + 5))
        
        # Get total count for recordcountTotal
        if atlas_search_text and need_score:
            # For Atlas Search, count with search stage
            count_pipeline = [
                {
                    "$search": {
                        "index": "atlas_search",
                        "text": {
                            "query": atlas_search_text,
                            "path": ["vote_desc", "description", "short_description", 
                                    "vote_document_text", "vote_title", "vote_question_text"]
                        }
                    }
                }
            ]
            if match_filters:
                count_pipeline.append({"$match": match_filters})
            count_pipeline.append({"$count": "total"})
            
            count_result = list(votes.aggregate(count_pipeline))
            result_count = count_result[0]["total"] if count_result else 0
        else:
            # For non-text searches, use regular count
            result_count = votes.count_documents(match_filters) if match_filters else 0
             
    except Exception as e:
        print(traceback.format_exc())
        model.log_quota.add_quota(request, 1)
        model.log_quota.log_search(request, {"query": "Invalid Query: Atlas Search error.", "query_extra": str(e), "resultNum": -1})
        return {'rollcalls': [], 'recordcount': 0, 'errormessage': f'Error during Atlas Search query: {str(e)}'}

    # Process results (same as original)
    mr = []
    next_id = 0
    max_score = 0
    for res in results:
        # Apply waterfall to text if jsapi
        if jsapi or rapi:
            res["text"] = waterfall_text(res)
            res["question"] = waterfall_question(res)

        if not max_score and need_score and "score" in res and res["score"] >= max_score:
            max_score = res["score"]

        if "date" in res:
            res["date_user"] = fix_date(res["date"])

        if len(mr) < row_limit:
            if "date_chamber_rollnumber" in res:
                del res["date_chamber_rollnumber"]
            if not need_score:
                mr.append(res)
            elif (res.get("score", 0) >= SCORE_THRESHOLD and
                  res.get("score", 0) >= SCORE_MULT_THRESHOLD * max_score):
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
        mr.sort(key=lambda x: -x.get("score", 0) - key_vote_boost * int(bool(x.get("key_flags", []))))

    # Prepare output (same as original)
    return_dict = {}
    return_dict["need_score"] = need_score
    return_dict["rollcalls"] = mr
    return_dict["recordcount"] = len(mr)
    return_dict["recordcountTotal"] = result_count
    return_dict["apiversion"] = "Q3 2017-01-08"
    return_dict["next_id"] = next_id
    if atlas_search_text and need_score:
        return_dict["fullTextSearch"] = atlas_search_text

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
        model.log_quota.log_search(request, {"query": {"atlas_search": atlas_search_text, "filters": match_filters}, "query_extra": "Very slow query", "resultNum": result_count})
    elif elapsed_time > 2:
        model.log_quota.add_quota(request, 2)
        model.log_quota.log_search(request, {"query": {"atlas_search": atlas_search_text, "filters": match_filters}, "query_extra": "Slow query", "resultNum": result_count})
    else:
        model.log_quota.add_quota(request, 1)
        model.log_quota.log_search(request, {"query": {"atlas_search": atlas_search_text, "filters": match_filters}, "resultNum": result_count})

    print(len(return_dict["rollcalls"]), result_count)
    return return_dict


if __name__ == "__main__":
    start = time.time()
    if len(sys.argv) > 1:
        args = " ".join(sys.argv[1:])
        print(query(args))
    else:
        print(query("the and"))
    end = time.time()
    print(end - start)
