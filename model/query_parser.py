""" The vote query parser. """

# pylint: disable=C0103, C0301, W0703
from __future__ import print_function
from datetime import date
import re
from time import strptime
import pymongo
from model.config import config

client = pymongo.MongoClient()
db = client[config["db"]]

field_types = {
    "codes": "codes", "codes.Clausen": "code", "codes.Peltzman": "code",
    "codes.Issue": "code", "cg_official_titles": "flexstr",
    "cg_summary": "flexstr", "congress": "int",
    "short_description": "flexstr", "vote_desc": "flexstr",
    "dtl_desc": "flexstr", "vote_document_text": "flexstr", "bill": "str",
    "vote_title": "flexstr", "vote_question_text": "flexstr",
    "alltext": "alltext", "yea": "int", "nay": "int", "question": "flexstr",
    "yea_count": "int", "nay_count": "int", "percent_support": "int",
    "key_flags": "key_flags", "support": "int", "voter": "voter",
    "chamber": "chamber", "saved": "saved", "dates": "date", "id": "strexact",
    "startdate": "date", "enddate": "date", "keyvote": "key_flags"}


def query_tab_printer(print_str, depth=0, debug=0):
    """ Simple tab-based pretty-printer.

    Parameters
    ----------
    printStr: str
        This is the string to pretty-print
    depth: int, optional
        This is the number of tabs to precede the printing
    debug: int, optional
        If debug is set to 0 or not set, nothing will print.
    """
    if not debug:
        return
    print("%s%s" % ("\t" * depth, print_str))


def check_date(date_str):
    """ Checks if date is either YYYY or YYYY-MM-DD

    Parameters
    ----------
    dateStr: str
        This is the string with the date to check
    """

    if len(date_str) == 4:
        try:
            strptime(date_str, "%Y")
            return True
        except Exception:
            return False
    elif len(date_str) == 10:
        try:
            strptime(date_str, "%Y-%m-%d")
            return True
        except Exception:
            return False
    else:
        return False


def query_dispatcher(text_query):
    """
    Oversees the query pipeline. Takes a raw text query, outputs the final
    goods to hit the database.

    Parameters
    ----------
    text_query: str
        This is the text string that we use to query

    Returns
    -------
    dict
        The dict to hit the database with.
        If the method does not work, returns the integer -1
    int
        Whether or not the database will need to return score information
        (full-text index search)
    str
        An error message
    """
    text_query = str(text_query)
    error_message = ""

    # If there's no field specified then this is the generic search, and we
    # should prepend it by doing the all text fuzzy search, then dispatch it.
    if ":" not in text_query:
        # If there's a literal string, adding description results in a regex
        # over just that field. Otherwise it will hit the fulltext index,
        # just like alltext would
        text_query = "alltext: " + text_query
        simple_search, need_score, error_message = parse_freeform_query(text_query)
        return [simple_search, need_score, error_message]

    # Remove string literals
    string_literals = re.findall(r"(\[[^\]]*\])", text_query)
    i = 0
    for _ in string_literals:
        text_query = re.sub(r"(\[[^\]]*\])",
                            "|STR_LITERAL_%s|" % str(i),
                            text_query,
                            count=1)
        i += 1

    stage1, error_message = parenthesis_parser(text_query, debug=0)
    if isinstance(stage1, int) and stage1 == -1:
        return [-1, 0, error_message]
    stage2, error_message = boolean_parser(stage1, debug=0)
    if isinstance(stage2, int) and stage2 == -1:
        return [-1, 0, error_message]
    stage3, error_message = organize_or(stage2, debug=0)
    if isinstance(stage3, int) and stage3 == -1:
        return [-1, 0, error_message]

    # Put string literals back in
    if string_literals:
        status, stage3_result = string_literal_parser(stage3, string_literals)
        if status == 0:
            return [{}, 0, "Error: Could not complete string literal substitution. "]
    else:
        stage3_result = stage3

    print(stage3_result)
    stage4, need_score, error_message = meta_process_freeform(stage3_result,
                                                              debug=0)
    return [stage4, need_score, error_message]


def string_literal_parser(search_space, replace_set, i=0, debug=0):
    """
    String literal re-substitution procedure. We remove string literals
    contained in [] square braces earlier in the parsing process. This
    re-injects them recursively regardless of how the parser has re-ordered
    data.

    Parameters
    ----------
    search_space : list
        A list of strings or lists output by step 3 of the parser
    replace_set : list
        An ordered list of strings that will be injected into the search space.
    i : int, optional
        What place in the replace_set you are in. Necessary for recursion to
        remember place in list.
    debug : int, optional
        Whether or not to print debug print statements (there are none in
        this method as of Apr 21)

    Returns
    -------
    int
        Success? 1 or 0
    list
        The updated search_space with substitutions injected. If the process
        errors out, the partially-completed task returns what it can.
    """

    for lit_replace in replace_set:
        sat = 0
        for j, chunk in enumerate(search_space):
            # This chunk of query is deeper, so pass through
            if isinstance(chunk, list):
                sat, search_space[j] = string_literal_parser(chunk,
                                                             [lit_replace], i)
                if sat == 0:
                    continue
                else:
                    break
            else:
                if "STR_LITERAL_" + str(i) + "|" in chunk:
                    search_space[j] = re.sub(r"\|STR\_LITERAL\_%s\|" % str(i),
                                             lit_replace,
                                             chunk,
                                             count=1)
                    sat = 1
                    break
        if sat == 0:
            return [0, search_space]
        i += 1
    return [1, search_space]


def parenthesis_parser(paren_string, depth=0, debug=1):
    """
    Step 1 of the parsing pipeline. Takes in a raw text query, identifies
    parenthetical groups. Removes useless parenthetical groups. Returns one of
    several error messages if necessary.

    Parameters
    ----------
    paren_string : str
        The query text
    depth : int, optional
        How deep we are in the depth search
    debug : int, optional
        Whether or not to output debug information

    Returns
    -------
    list
        A list suitable for ingestion in the boolean parser.
        If query fails, returns the integer -1
    str
        Error message, if any.
    """

    query_tab_printer(paren_string, depth, debug)
    # Check for recursive loop
    if depth > 5:
        query_tab_printer("error: excessive depth", depth, debug)
        return [-1, "Error: Excessive query depth. Please simplify query."]

    # Check for parenthesis matching
    if paren_string.count("(") != paren_string.count(")"):
        query_tab_printer("error: unmatched parentheses!", depth, debug)
        return [-1, "Error: Syntax error in query. You have unmatched parentheses."]

    # Check for obvious boolean errors that should never happen
    if (paren_string.strip().endswith(" AND") or
            paren_string.strip().startswith("AND ") or
            paren_string.strip().endswith(" OR") or
            paren_string.strip().startswith("OR ")):
        query_tab_printer("error: starts or ends with invalid boolean!",
                          depth, debug)
        return [-1, "Error: Query starts or ends with a boolean and is invalid."]

    # Pre-allocate results list
    results = []
    result_string = ""
    i = 0

    # Parentheses are only used to override order of operations. If there's
    # no or at this level, then we can just treat this as a string.
    or_find = paren_string.find(" OR ")
    if or_find == -1:
        query_tab_printer("no logic, clean", depth, debug)
        # No boolean logic at all
        paren_string = paren_string.replace("(", "").replace(")", "")
        return [paren_string, ""]

    # If we're here, there's an or.
    query_tab_printer("An or has been found...", depth, debug)
    # Identify parenthetical groups one at a time.
    while i != -1:
        old_index = i
        # Find the first parenthesis starting from our current position, i
        i = paren_string.find("(", i)
        if i != -1:
            # Everything up until the parenthesis can be added into our
            # results, untouched
            result_string = result_string + paren_string[old_index:i]
            query_tab_printer("Found at least one parenthesis", depth, debug)
            # Okay now walk slowly through string to find the close parenthesis
            paren_count = 1
            found_end = 0
            for j in range(i + 1, len(paren_string)):
                # Found nested parenthesis
                if paren_string[j] == "(":
                    paren_count += 1
                # Found a close parenthesis
                elif paren_string[j] == ")":
                    paren_count -= 1
                    # Found matching close parenthesis
                    if paren_count == 0:
                        query_tab_printer("Found matching close parenthesis",
                                          depth, debug)
                        # Take what's inside the parenthetical and recursively
                        # search it for parentheticals.
                        result, error_message = parenthesis_parser(
                            paren_string[i+1:j], depth+1, debug
                        )
                        # Start looking after the current parenthesis
                        i = j + 1
                        # Remind my code below we've found the matching
                        # parenthesis
                        found_end = 1

                        # If it's a string then there was nothing interesting
                        # in the parentheses and we can keep treating it as a
                        # string.
                        if isinstance(result, str):
                            result_string = result_string + result
                        # If it's a list, then the parenthetical parser thinks
                        # the parentheses might matter (there's an or in there)
                        elif isinstance(result, list):
                            # Append anything in the buffer so far.
                            if result_string.strip():
                                results.append(result_string.strip())
                                result_string = ""
                            # Now, separately, append the recursive result.
                            results.append(result)
                        # If it's an error, cascade the error back.
                        elif isinstance(result, int) and result == -1:
                            return [-1, error_message]
                        break

            # Unclosed parenthesis
            if found_end == 0:
                return [-1, "Error: Unclosed parenthesis in query."]

    # Whatever is left over at the end, add it to the buffer
    result_string = result_string + paren_string[old_index:]
    if result_string.strip():
        results.append(result_string.strip())

    # If this appears to be a redundant parenthesis [i.e. ((A))], then return
    # what's inside, if not return the whole thing.
    if len(results) == 1 and isinstance(results[0], list):
        return [results[0], ""]

    return [results, ""]


def boolean_parser(my_list, depth=0, debug=1):
    """
    Step 2 of the parsing pipeline. Takes what was output from the
    parenthetical parser, and processes it for booleans. We leverage the
    parenthetical parser to sort out parenthesis causing order of operations
    issues. This will remove AND booleans, since we don't need them explicitly.

    Parameters
    ----------
    my_list : list
        The output from the parenthesis parser.
    depth : int, optional
        How deep we are in the recursive stack
    debug : int, optional
        Whether or not to output debug information

    Returns
    -------
    list
        A list suitable for ingestion into the next phase of the parser
        If query fails, returns the integer -1
    str
        Error message, if any.
    """
    error_message = ""

    # I got an error code, not a list
    if isinstance(my_list, int):
        return [-1, "Boolean parser did not receive valid list."]

    # I got a string, not a list, treat it as a one element list
    if isinstance(my_list, str):
        my_list = [my_list]
    results = []

    # Loop through our list
    for item in my_list:
        query_tab_printer(item, depth, debug)
        # The list item is a list, recursively process it
        if isinstance(item, list):
            res, error_message = boolean_parser(item, depth+1, debug)
            # It returned an error, propagate that
            if isinstance(res, int) and res == -1:
                return [-1, error_message]
            results.append(res)
        # The list item is a string
        else:
            # Remove those redundant AND queries.
            item = re.sub("(^| )AND( |$)", " ", item)
            done = 0
            i = 0
            while done == 0:
                # In cases where there's a OR immediately before a
                # parenthesis, hack to make the parser realize this.
                if item.endswith(" OR"):
                    item += " "

                # Look for the nearest or
                or_find = item.find("OR ", i)

                # There was no or here, just append it as is
                if or_find == -1:
                    # We're OK
                    if item[i:].strip():
                        results.append(item[i:].strip())
                    done = 1
                # There is an or. Append anything we have in our buffer, then
                # append the OR item separately.
                else:
                    if or_find != i and item[i:or_find].strip():
                        results.append(item[i:or_find].strip())
                    results.append("OR")
                    # Update search to start after the OR we found.
                    i = or_find + 2

    # Query seems to start with an OR inside a parenthesis, that's an error.
    if isinstance(results[0], str) and results[0] == "OR":
        query_tab_printer("error: invalid query, starts with or clause.",
                          depth, debug)
        return [-1, "Invalid query: starts with OR clause."]
    # Query seems to end with an OR inside a parenthesis, that's an error.
    if isinstance(results[-1], str) and (results[-1] == "OR" or
                                         results[-1].endswith(" OR")):
        query_tab_printer("error: invalid query, ends with or clause.",
                          depth, debug)
        return [-1, "Invalid query: ends with OR clause."]

    return [results, ""]


def organize_or(segments, depth=0, debug=1):
    """
    Step 3 of the parsing pipeline. Takes the output from the boolean
    parser and re-organizes it. At the end, every atomic list will either
    not contain an OR statement, or start with OR and then contain a series
    of things that should be or-ed together

    Parameters
    ----------
    segments : list
        Output from boolean parser
    depth : int
        How deep we are in the recursive search
    debug : int
        Whether or not to output debug information

    Returns
    -------
    list
        A list suitable for being processed by the meta freeform query parser
        If query fails, returns the integer -1
    str
        Error message, if any
    """

    error_message = ""

    # We have an error code, not a list.
    if isinstance(segments, int) and segments == -1:
        return [-1, "OR parser did not receive list."]

    if depth > 10:
        return [-1, "Error: Infinite recursive loop in OR processor. Segments: " + str(segments)]

    # We have a string, not a list, so we have no ORs or anything tough.
    if isinstance(segments, str):
        query_tab_printer("Just a string, no worries.", depth, debug)
        return [segments, ""]
    # We have deeper segments but not ORs. Iterate through the segments,
    # process them recursively, return them as separate segments (this happens
    # with weird recursive ANDs)
    elif isinstance(segments, list) and "OR" not in segments:
        new_segments = []
        for segment in segments:
            res, error_message = organize_or(segment, depth + 1, debug)
            if isinstance(res, int) and res == -1:
                return [-1, error_message]
            else:
                new_segments.append(res)
        return [new_segments, ""]
    # There's an or.
    else:
        new_segments = []
        # We prefix the OR segment with an OR.
        new_segments.append("OR")
        buffer_segments = []
        # Loop through all the segments we got, buffer them, and then output
        # them
        for segment in segments:
            # We found an OR, dump everything in the buffer
            if isinstance(segment, str) and segment == "OR":
                # Nothing in the buffer, OR came first, this is bad.
                if not buffer_segments:
                    query_tab_printer("Error: Or comes at beginning of query.",
                                      depth, debug)
                    return [-1, "Query error: OR comes at beginning of unprocessed query."]
                # We're good, dump it in the buffer
                else:
                    # Recursively process the buffer to make sure it doesn't
                    # contain more ORs
                    res, error_message = organize_or(buffer_segments,
                                                     depth + 1, debug)
                    # Recursive processing failed, dump it.
                    if isinstance(res, int) and res == -1:
                        return [-1, error_message]
                    # We got back a list, add it.
                    elif len(res) > 1:
                        new_segments.append(res)
                    # We got back an item in a redundant list, just
                    # pass-through the item.
                    else:
                        new_segments.append(res[0])

                    buffer_segments = []
            # If it's not an OR, then add it to the buffer
            else:
                buffer_segments.append(segment)

        # If we have nothing in the buffer at the end then the query ended
        # with OR
        if not buffer_segments:
            query_tab_printer("Error: OR comes at end of query.", depth, debug)
            return [-1, "Query error: OR comes at end of unprocessed query."]
        # Dump the remaining buffer
        else:
            # Recursively process as above
            res, error_message = organize_or(buffer_segments, depth + 1, debug)
            # Returned error
            if isinstance(res, int) and res == -1:
                return [-1, error_message]
            elif len(res) > 1:
                new_segments.append(res)
            else:
                new_segments.append(res[0])

        return [new_segments, ""]


def meta_process_freeform(query_out, depth=0, debug=0):
    """
    Stage 4 of the processing pipeline. Takes the output of the or processor,
    dispatches it to the freeform query parser, assembles it into a
    Mongo-ready cluster of data.

    Parameters
    ----------
    query_out : list
        Output from the or-processor, to dispatch to freeform query parser
    depth : int, optional
        How deep we are in the depth search
    debug : int, optional
        Whether or not to output debug information

    Returns
    -------
    dict
        Valid mongo query dict to hit database with.
    int
        Whether or not the query will need score information
    str
        Any error generated during the query.
    """
    query_dict = {}
    need_score = 0

    # We got a string, just query it directly
    if isinstance(query_out, str):
        res, need_return_score, error_message = parse_freeform_query(query_out)
        if isinstance(res, int) and res == -1:
            return [-1, 0, error_message]
        need_score = need_score or need_return_score
        return [res, need_score, ""]
    else:
        if query_out[0] == "OR":
            query_dict["$or"] = []
            for i in range(1, len(query_out)):
                if isinstance(query_out[i], list):
                    res, need_return_score, error_message = meta_process_freeform(query_out[i], depth + 1, debug)
                    if isinstance(res, int) and res == -1:
                        return [-1, 0, error_message]
                    need_score = need_score or need_return_score
                    query_dict["$or"].append(res)
                else:
                    res, need_return_score, error_message = parse_freeform_query(query_out[i])
                    if isinstance(res, int) and res == -1:
                        return [-1, 0, error_message]
                    need_score = need_score or need_return_score
                    query_dict["$or"].append(res)
        else:
            if len(query_out) == 1:
                res, need_return_score, error_message = parse_freeform_query(query_out[0])
                if isinstance(res, int) and res == -1:
                    return [-1, 0, error_message]
                need_score = need_score or need_return_score
                query_dict = res
            else:
                query_dict["$and"] = []
                for item in query_dict:
                    res, need_return_score, error_message = meta_process_freeform(item, depth + 1, debug)
                    if isinstance(res, int) and res == -1:
                        return [-1, 0, error_message]
                    need_score = need_score or need_return_score
                    query_dict["$and"].append(res)

    return [query_dict, need_score, error_message]


def parse_freeform_query(qtext):
    """
    Takes an atomic Mongo query (no AND, no OR, no parentheses, etc. Isolates
    field names and dispatches the fields to be assembled.

    Parameters
    ----------
    qtext : str
        An atomic Mongo query.


    Returns
    -------
    dict
        The query dictionary to dispatch to Mongo.
    int
        Whether or not Mongo needs to return scoring information
    str
        Any error string generated further down the parser
    """

    global field_types
    error = 0
    query_field = ""
    query_words = ""
    need_score = 0
    ns_max = 0
    query_dict = {}

    for word in qtext.split():
        # first we want to find a word with ":" in it
        if ":" in word:
            # Deal with whatever we've got loaded for the old field before
            # assembling the new one.
            if query_field:
                query_dict, need_score, error_message = assemble_query_chunk(query_dict, query_field, query_words)
                ns_max = ns_max or need_score
                # print need_score, ns_max
                if error_message:
                    error = 1
                    break
                query_words = ""

            query_field, query_words = word.split(":", 1)
            if query_field.lower() not in [key.lower() for key in field_types]:
                error_message = "Invalid search field: "+query_field
                # Invalid search field
                error = 1
                break
            else:
                # We're good
                continue
        else:
            if not query_field:
                query_field = "alltext"
                query_words = word.strip()
                print("assuming alltext search for unspecified field for word " + word)
            else:
                query_words = query_words + " " + word

    if not error:
        query_dict, need_score, error_message = assemble_query_chunk(query_dict, query_field, query_words)
        ns_max = ns_max or need_score
        if error_message:
            return [-1, 0, error_message]
        print("Getting ready to submit final adjudication:\n%s" % ns_max)
        return [query_dict, ns_max, ""]
    # Got an error in a chunk
    else:
        return [-1, 0, error_message]


def assemble_query_chunk(query_dict, query_field, query_words):
    """
    Takes one field and what to query it, ascertains field type, and then
    builds the query for that field alone. Asks the adder to add field to dict.

    Parameters
    ----------
    query_dict : dict
        The existing query dictionary
    query_field : str
        Name of field to query
    query_words : str
        What to query it with

    Returns
    -------
    dict
        The updated query dictionary
    int
        Whether Mongo needs score information
    str
        Any error message generated
    """

    print("asked to assemble " + query_field + " / " + query_words)

    global field_types
    query_words = query_words.strip()
    if not query_words:
        return [query_dict, 0, "Error: Empty search field."]

    need_score = 0
    field_type = "str" if query_field not in field_types else field_types[query_field]
    if field_type == "flexstr":
        if query_words.strip()[0] == "[" and query_words.strip()[-1] == "]":
            query_words = query_words[1:-1]

        if query_words.strip()[0] == "\"" and query_words.strip()[-1] == "\"":
            query_words = query_words[1:-1].lower()
            field_type = "str"
        else:
            field_type = "fulltext"

    if field_type == "alltext":
        if query_words.strip()[0] == "[" and query_words.strip()[-1] == "]":
            query_words = query_words[1:-1]
        if query_words.strip()[0] == "\"" and query_words.strip()[-1] == "\"":
            query_words = query_words[1:-1].lower()
            print("alltext to regexp or")
            # Do a fulltext query to isolate candidate superset
            valid_id_start = []
            for r in db.voteview_rollcalls.find({"$text": {"$search": query_words.lower().decode('utf-8')}}, {"_id": 0, "id": 1}):
                valid_id_start.append(r["id"])
            # Add candidate votes to query
            query_dict = add_to_query_dict(query_dict,
                                           "id", {"$in": valid_id_start})
            # Now regex from the candidates
            query_dict = add_to_query_dict(query_dict, "$or", [{x: {"$regex": ".*" + query_words.lower().decode('utf-8') + ".*", "$options": "i"}} for x in field_types if field_types[x] in ["str", "fulltext", "flexstr"]])

            return [query_dict, need_score, ""]
        else:
            print("alltext to fulltext")
            field_type = "fulltext"

    # CODES: Search all code fields
    if field_type == "codes":
        query_dict = add_to_query_dict(query_dict, "$or", [{x: {"$regex": ".*" + query_words.lower() + ".*", "$options": "i"}} for x in field_types if x.startswith("codes.")])
    elif field_type == "code":
        query_dict = add_to_query_dict(query_dict, query_field, {"$regex": ".*" + query_words.lower() + ".*", "$options": "i"})
    elif field_type == "fulltext":
        query_dict = add_to_query_dict(query_dict, "$text", {"$search": query_words.lower().decode('utf-8')})
        need_score = 1
    elif field_type == "str":
        if query_words[0] == "\"" and query_words[-1] == "\"":
            query_words = query_words[1:-1]

        # Do a fulltext query to isolate candidate superset.
        valid_id_start = []
        for r in db.voteview_rollcalls.find({"$text": {"$search": query_words.lower()}}, {"_id": 0, "id": 1}):
            valid_id_start.append(r["id"])
        # Add candidate votes to query
        query_dict = add_to_query_dict(query_dict, "id", {"$in": valid_id_start})
        # Now regex from the candidates
        query_dict = add_to_query_dict(query_dict, query_field, {"$regex": ".*" + query_words.lower().decode('utf-8') + ".*", "$options": "i"})

    # STREXACT fields: have to exactly match the full field, was used for
    # 'bill' but no longer
    elif field_type == "strexact":
        query_dict = add_to_query_dict(query_dict,
                                       query_field,
                                       query_words.upper())

    # INT can be searched by integer or range
    elif field_type == "int":
        # Hack: Mapping shorter searches.
        if query_field == "yea":
            query_field = "yea_count"
        elif query_field == "nay":
            query_field = "nay_count"
        elif query_field == "support":
            query_field = "percent_support"

        if " " not in query_words:
            try:
                query_dict[query_field] = int(query_words)
            except Exception:
                return [query_dict, 0, "Error: Non-integer search to integer field."]
        elif (query_words[0] == "[" and query_words[-1] == "]" and
              "to" in query_words):
            range_set = query_words[1:-1]
            min_range, max_range = [x.strip() for x in range_set.split(" to ")]
            query_dict[query_field] = {}
            if min_range:
                try:
                    query_dict[query_field]["$gte"] = int(min_range)
                except Exception:
                    return [query_dict, 0, "Error: Non-integer search to integer field."]
            else:
                min_range = -99

            if max_range:
                try:
                    query_dict[query_field]["$lte"] = int(max_range)
                except Exception:
                    return [query_dict, 0, "Error: Non-integer search to integer field."]
            else:
                max_range = 999

            if int(max_range) < int(min_range):
                return [query_dict, 0, "Error: Maximum value of field " + str(query_field) + " cannot be lower than minimum value."]
        else:
            try:
                vals = [int(val) for val in query_words.split()]
            except Exception:
                return [query_dict, 0, "Error: Non-integer search to integer field."]
            query_dict[query_field] = {}
            query_dict[query_field]["$in"] = vals
    # VOTER type: Does the voter exist in the vote?
    elif field_type == "voter":
        name_set = query_words.split(" ")
        for name in name_set:
            try:
                name = int(name)
                print("i'm here with name ", name)
                query_dict = add_to_query_dict(query_dict, "votes.icpsr", name)
            except Exception:
                error_message = "Error: invalid member ID in voter search."
                return [query_dict, 0, error_message]

    # KEYVOTE type: Is this a key vote?
    elif field_type == "key_flags":
        if query_words == "1":
            query_dict["key_flags"] = {"$exists": 1}
        elif query_words == "CQ":
            query_dict["key_flags"] = {"$in": [query_words]}

    # CHAMBER type: Senate or House?
    elif field_type == "chamber":
        chamber = query_words.strip()
        if not any(x == chamber.lower() for x in ["senate", "house"]):
            error_message = "Error: invalid chamber provided in search."
            return [query_dict, 0, error_message]
        else:
            query_dict = add_to_query_dict(query_dict, "chamber", query_words.title())

    # Saved fields: pull all the votes associated with a saved stash, and
    # limit to those.
    elif field_type == "saved":
        saved_id = query_words.strip()
        res = db.stash.find_one({'id': saved_id})
        if not res:
            valid_ids = [-1]
        else:
            valid_ids = []
            if "votes" in res:
                valid_ids = valid_ids + res["votes"]
            if "old" in res:
                valid_ids = list(set(valid_ids + res["old"]))
            query_dict = add_to_query_dict(query_dict, "id", {"$in": valid_ids})

    # DATE fields: handle three kinds of date searches, some exact range or
    # values, and then greater or less than
    # TODO: check if startdate and enddate entered are not in the right order
    # have to check with Aaron about whether this will only check within a
    # level of the query because it is OK to have a startdate be later than
    # an enddate if the two are in different parts of the query that have been
    # joined by an OR
    elif field_type == "date":
        date_query = query_words.strip()
        nextyear = str(date.today().year + 1)

        if " " not in date_query:
            if check_date(query_words):
                if query_field == "dates":
                    query_dict["date"] = date_query
                elif query_field == "startdate":
                    if "date" not in query_dict:
                        query_dict["date"] = {}
                    if query_words < "1787-01-01":
                        query_dict["date"]["$gte"] = "1787-01-01"
                    else:
                        query_dict["date"]["$gte"] = date_query
                elif query_field == "enddate":
                    if "date" not in query_dict:
                        query_dict["date"] = {}
                    if date_query > nextyear + "-01-01":
                        query_dict["date"]["$lte"] = nextyear + "-01-01"
                    else:
                        query_dict["date"]["$lte"] = date_query
            else:
                return [query_dict, 0, "Error: Date field not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
        elif query_field != "dates":
            return [query_dict, 0, "Error: 'startdate' and 'enddate' only take a single date as YYYY or YYYY-MM-DD."]

        elif date_query[0] == "[" and date_query[-1] == "]" and "to" in date_query:
            range_set = date_query[1:-1]
            min_range, max_range = [x.strip() for x in range_set.split(" to ")]
            if "date" in query_dict:
                return [query_dict, 0, "Error: only use the range in 'dates' or 'startdate' and 'enddate', not both"]
            else:
                query_dict["date"] = {}
            if min_range:
                if check_date(min_range):
                    query_dict["date"]["$gte"] = min_range
                else:
                    return [query_dict, 0, "Error: Date field not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
            else:
                min_range = "0000"
            if max_range:
                if check_date(max_range):
                    query_dict["date"]["$lte"] = max_range
                else:
                    return [query_dict, 0, "Error: Date field not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
            else:
                max_range = "9999"

            if max_range < min_range:
                return [query_dict, 0, "Error: Maximum value of field " + str(query_field) + " cannot be lower than minimum value."]

        else:
            if all([check_date(d) for d in date_query.split()]):
                dates = date_query.split()
            else:
                return [query_dict, 0, "Error: A date is not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
            query_dict["date"] = {}
            query_dict["date"]["$in"] = dates

    else:
        error_message = "Error: invalid field for search: "+query_field
        return [query_dict, 0, error_message]

    print("final ns for this tier", need_score)
    return [query_dict, need_score, ""]


def add_to_query_dict(query_dict, query_field, to_add):
    """
    Adds a query to the query dictionary. We need this because of how Mongo
    handles two queries hitting the same field.

    Example: description: tax description: iraq
    Proceeds in the following manner:
        1) If the query dict has this field, we've searched for it before.
        Delete from the query dictionary and add both the old search and the
        new search into an AND statement.
        2) If the query dict has an AND field, maybe we've searched for this
        twice before.
            2a) The and field has the thing we're searching for: add the new
            search to the and.
            2b) The and field does not have the thing we're searching for (no
            prior searches for this field):
                Just add field to the base search.
        3) If the query dict doesn't have the field or an AND statement, then
        just add field to base search

    TODO: Implement proper error handling

    Parameters
    ----------
    query_dict : dict
        The existing query dictionary
    query_field : str
        Name of field to query
    query_words : str
        Exactly what we're quering

    Returns
    -------
    dict
        The updated query dictionary
    """
    # We are already querying this exactly once (i.e. this is a our second
    # search for a given description)
    if query_field in query_dict:
        # Take the current search, remove it
        prev_value = query_dict[query_field]
        del query_dict[query_field]
        # Add both to an and statement
        query_dict["$and"] = [{query_field: prev_value}, {query_field: to_add}]
    # We're querying something at least twice, is it the thing we're looking
    # for?
    elif "$and" in query_dict:
        found = 0
        for and_item in query_dict["$and"]:
            # Iterating through our compound and
            if isinstance(and_item, dict):
                # Is it our item?
                if query_field in and_item:
                    # It is
                    found = 1
                    break
            # Something in the and statement is not a dict? Error?
            else:
                return {}

        # We already have at least two of the same field, add this one into
        # the mix of the and statement
        if found == 1:
            query_dict["$and"].append({query_field: to_add})
        # We have zero of the field, add this at the top level of the query
        elif query_field not in query_dict:
            query_dict[query_field] = to_add
        # This shouldn't happen
        else:
            print("huh?")
    else:
        query_dict[query_field] = to_add
    return query_dict
