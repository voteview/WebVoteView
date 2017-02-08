# Imports
from datetime import date
from time import strptime
from bson.objectid import ObjectId
import pymongo
from pprint import pprint
import sys
import traceback
import time
import re
import json
import logQuota
from downloadVotes import waterfallText, waterfallQuestion

client = pymongo.MongoClient()
try:
	dbConf = json.load(open("./model/db.json","r"))
	stopWords = [x.strip() for x in open("./model/stop_words.txt","r").read().split("\n")]
	db = client[dbConf["dbname"]]
except:
        try:
                dbConf = json.load(open("./db.json","r"))
		stopWords = [x.strip() for x in open("./stop_words.txt","r").read().split("\n")]
        except:
		stopWords = []
                dbConf = {'dbname': 'voteview'}
        db = client[dbConf["dbname"]]

try:
	scoreData = json.load(open("auth.json","r"))
except:
        try:
                scoreData = json.load(open("model/auth.json","r"))
        except:
                scoreData = {'scoreThreshold': 0,
                             'scoreMultThreshold': 0}

SCORE_THRESHOLD = scoreData["scoreThreshold"] if "scoreThreshold" in scoreData else 0.75
SCORE_MULT_THRESHOLD = scoreData["scoreMultThreshold"] if "scoreMultThreshold" in scoreData else 0.5

fieldTypes = {"codes": "codes", "codes.Clausen": "code", "codes.Peltzman": "code", "codes.Issue": "code",
		"description": "flexstr", "congress": "int", "short_description": "flexstr", "vote_desc": "flexstr", 
		"vote_document_text": "flexstr", "bill": "str", "vote_title": "flexstr", "vote_question_text": "flexstr", "alltext": "alltext", "yea": "int", "nay": "int", "question": "flexstr",
		"yea_count": "int", "nay_count": "int", "percent_support": "int", "key_flags": "key_flags",
	        "support": "int", "voter": "voter", "chamber": "chamber", "saved": "saved", "dates": "date", "id": "strexact",
		"startdate": "date", "enddate": "date", "keyvote": "key_flags"}

# Simple tab-based pretty-printer to output debug info.
def pPrint(printStr, depth=0,debug=0):
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
	tabChar = "\t"*depth
	print tabChar,
	print printStr

# Simple check that dates are formatted correctly
def checkDate(dateStr):
	""" Checks if date is either YYYY or YYYY-MM-DD

	Parameters
	----------
	dateStr: str
		This is the string with the date to check
	"""
	
	if len(dateStr) == 4:
		try:
			strptime(dateStr, "%Y")
			return True
		except:
			return False
	elif len(dateStr) == 10:
		try:
			strptime(dateStr, "%Y-%m-%d")
			return True
		except:
			return False
	else:
		return False

def queryDispatcher(textQ):
	""" Oversees the query pipeline. Takes a raw text query, outputs the final goods to hit the database.
	
	Parameters
	----------
	textQ: str
		This is the text string that we use to query

	Returns
	-------
	dict
		The dict to hit the database with.
		If the method does not work, returns the integer -1
	int
		Whether or not the database will need to return score information (full-text index search)
	str
		An error message
	"""
	textQ = str(textQ)
	errorMessage = ""

	# If there's no field specified then this is the generic search, and we should prepend it by doing
	# the all text fuzzy search, then dispatch it.
	if not ":" in textQ:
		# If there's a literal string, adding description results in a regex over just that field
		# Otherwise it will hit the fulltext index, just like alltext would
		textQ = "alltext: " + textQ
		simpleSearch, needScore, errorMessage = parseFreeformQuery(textQ)
		return [simpleSearch, needScore, errorMessage]

	# Remove string literals
	strLiterals = re.findall("(\[[^\]]*\])",textQ)
	i=0
	for sub in strLiterals:
		textQ = re.sub("(\[[^\]]*\])","|STR_LITERAL_"+str(i)+"|",textQ,count=1)
		i=i+1

	stage1, errorMessage = parenParser(textQ,debug=0)
	if type(stage1)==type(0) and stage1==-1:
		return [-1, 0, errorMessage]
	stage2, errorMessage = booleanParser(stage1,debug=0)
	if type(stage2)==type(0) and stage2==-1:
		return [-1, 0, errorMessage]
	stage3, errorMessage = organizeOr(stage2,debug=0)
	if type(stage3)==type(0) and stage3==-1:
		return [-1, 0, errorMessage]

	# Put string literals back in
	if len(strLiterals):
		status, stage3Result = strLiteralParser(stage3, strLiterals)
		if status==0:
			return [{}, 0, "Error: Could not complete string literal substitution. "]
	else:
		stage3Result = stage3
	
	print stage3Result
	stage4, needScore, errorMessage = metaProcessFreeformQuery(stage3Result,debug=0)
	return [stage4, needScore, errorMessage]

def strLiteralParser(searchSpace, replaceSet, i=0, debug=0):
	""" String literal re-substitution procedure. We remove string literals contained in []
	square braces earlier in the parsing process. This re-injects them recursively regardless of
	how the parser has re-ordered data.

	Parameters
	----------
	searchSpace : list
		A list of strings or lists output by step 3 of the parser
	replaceSet : list
		An ordered list of strings that will be injected into the search space.
	i : int, optional
		What place in the replaceSet you are in. Necessary for recursion to remember place in list.
	debug : int, optional
		Whether or not to print debug print statements (there are none in this method as of Apr 21)

	Returns
	-------
	int
		Success? 1 or 0
	list
		The updated searchSpace with substitutions injected. If the process errors out, the
		partially-completed task returns what it can.
	"""

	for litReplace in replaceSet:
		sat=0
		for j in xrange(0,len(searchSpace)):
			if type(searchSpace[j])==type([]): # This chunk of query is deeper, so pass through
				sat, searchSpace[j] = strLiteralParser(searchSpace[j], [litReplace], i)
				if sat==0:
					continue
				else:
					break
			else:
				if "STR_LITERAL_"+str(i)+"|" in searchSpace[j]:
					searchSpace[j] = re.sub("\|STR\_LITERAL\_"+str(i)+"\|",litReplace,searchSpace[j],count=1)
					sat=1
					break
		if sat==0:
			return [0, searchSpace]
		i=i+1
	return [1, searchSpace]
				
def parenParser(myStr, depth=0, debug=1):
	""" Step 1 of the parsing pipeline. Takes in a raw text query, identifies parenthetical groups.
	Removes useless parenthetical groups. Returns one of several error messages if necessary.

	Parameters
	----------
	myStr : str
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

	pPrint(myStr, depth, debug)
	# Check for recursive loop
	if depth>5:
		pPrint("error: excessive depth",depth,debug)
		return [-1, "Error: Excessive query depth. Please simplify query."]

	# Check for parenthesis matching
	if myStr.count("(") != myStr.count(")"):
		pPrint("error: unmatched parentheses!", depth,debug)
		return [-1, "Error: Syntax error in query. You have unmatched parentheses."]

	# Check for obvious boolean errors that should never happen
	if myStr.strip().endswith(" AND") or myStr.strip().startswith("AND ") or myStr.strip().endswith(" OR") or myStr.strip().startswith("OR "):
		pPrint("error: starts or ends with invalid boolean!", depth, debug)
		return [-1, "Error: Query starts or ends with a boolean and is invalid."]

	# Pre-allocate results list
	results = []
	resultString = ""
	i=0

	# Parentheses are only used to override order of operations. If there's no or at this level, then we can just treat this as a string.
	orFind = myStr.find(" OR ")
	if orFind==-1:
		pPrint("no logic, clean",depth,debug)
		# No boolean logic at all
		myStr = myStr.replace("(","").replace(")","")
		return [myStr, ""]

	# If we're here, there's an or.
	pPrint("An or has been found...", depth, debug)
	# Identify parenthetical groups one at a time.
	while i!=-1:
		oldI = i
		# Find the first parenthesis starting from our current position, i
		i = myStr.find("(",i)
		if i != -1:
			# Everything up until the parenthesis can be added into our results, untouched
			resultString = resultString+myStr[oldI:i]
			pPrint("Found at least one parenthesis", depth, debug)
			# Okay now walk slowly through string to find the close parenthesis
			parenCount=1
			foundEnd=0
			for j in xrange(i+1, len(myStr)):
				# Found nested parenthesis
				if myStr[j]=="(":
					parenCount+=1
				# Found a close parenthesis
				elif myStr[j]==")":
					parenCount-=1
					# Found matching close parenthesis
					if parenCount==0:
						pPrint("Found matching close parenthesis",depth,debug)
						# Take what's inside the parenthetical and recursively search it for parentheticals.
						result, errorMessage = parenParser(myStr[i+1:j],depth+1,debug)
						i = j+1 # Start looking after the current parenthesis
						foundEnd=1 # Remind my code below we've found the matching parenthesis
						
						# If it's a string then there was nothing interesting in the parentheses and we can keep treating it as a string.
						if type(result)==type(""):
							resultString = resultString+result
						# If it's a list, then the parenthetical parser thinks the parentheses might matter (there's an or in there).
						elif type(result)==type([]):
							# Append anything in the buffer so far.
							if len(resultString.strip()):
								results.append(resultString.strip())
								resultString = ""
							# Now, separately, append the recursive result.
							results.append(result)
						# If it's an error, cascade the error back.
						elif type(result)==type(0) and result==-1:
							return [-1, errorMessage]
						break

			# Unclosed parenthesis
			if foundEnd==0:
				return [-1, "Error: Unclosed parenthesis in query."]

	# Whatever is left over at the end, add it to the buffer
	resultString = resultString+myStr[oldI:]
	if len(resultString.strip()):
		results.append(resultString.strip())

	# If this appears to be a redundant parenthesis [i.e. ((A))], then return what's inside, if not return the whole thing.
	if len(results)==1 and type(results[0])==type([]):
		return [results[0], ""]
	else:
		return [results, ""]

def booleanParser(myList, depth=0, debug=1):
	""" Step 2 of the parsing pipeline. Takes what was output from the parenthetical parser, and processes it for booleans.
	We leverage the parenthetical parser to sort out parenthesis causing order of operations issues.
	This will remove AND booleans, since we don't need them explicitly.

	Parameters
	----------
	myList : list
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
	errorMessage = ""

	# I got an error code, not a list
	if type(myList)==type(0):
		return [-1, "Boolean parser did not receive valid list."]

	# I got a string, not a list, treat it as a one element list
	if type(myList)==type(""):
		myList = [myList]
	results = []

	# Loop through our list
	for item in myList:
		pPrint(item, depth, debug)
		# The list item is a list, recursively process it
		if type(item)==type([]):
			res, errorMessage = booleanParser(item, depth+1, debug)
			# It returned an error, propagate that
			if type(res)==type(0) and res==-1:
				return [-1, errorMessage]
			results.append(res)
		# The list item is a string
		else:
			# Remove those redundant AND queries.
			item = re.sub("(^| )AND( |$)"," ",item)
			done=0
			i=0
			while done==0:
				# In cases where there's a OR immediately before a parenthesis, hack to make the parser realize this.
				if item.endswith(" OR"):
					item=item+" "

				# Look for the nearest or
				orFind = item.find("OR ",i)

				# There was no or here, just append it as is
				if orFind==-1:
					# We're OK
					if len(item[i:].strip()):
						results.append(item[i:].strip())
					done=1
				# There is an or. Append anything we have in our buffer, then append the OR item separately.
				else:
					if orFind!=i and len(item[i:orFind].strip()):
						results.append(item[i:orFind].strip())
					results.append("OR")
					# Update search to start after the OR we found.
					i = orFind+2

	# Query seems to start with an OR inside a parenthesis, that's an error.
	if type(results[0])==type("") and results[0]=="OR":
		pPrint("error: invalid query, starts with or clause.",depth,debug)
		return [-1, "Invalid query: starts with OR clause."]
	# Query seems to end with an OR inside a parenthesis, that's an error.
	if type(results[-1])==type("") and (results[-1]=="OR" or results[-1].endswith(" OR")):
		pPrint("error: invalid query, ends with or clause.",depth,debug)
		return [-1, "Invalid query: ends with OR clause."]

	return [results, ""]

def organizeOr(segments,depth=0,debug=1):
	""" Step 3 of the parsing pipeline. Takes the output from the boolean parser and re-organizes it. At the end, every atomic list will either
	Not contain an OR statement, or start with OR and then contain a series of things that should be or-ed together

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

	errorMessage = ""

	# We have an error code, not a list.
	if type(segments)==type(0) and segments==-1:
		return [-1, "OR parser did not receive list."]

	if depth>10:
		return [-1, "Error: Infinite recursive loop in OR processor. Segments: "+str(segments)]

	# We have a string, not a list, so we have no ORs or anything tough.
	if type(segments)==type(""):
		pPrint("Just a string, no worries.",depth,debug)
		return [segments, ""]
	# We have deeper segments but not ORs. Iterate through the segments, process them recursively, return
	# them as separate segments (this happens with weird recursive ANDs)
	elif type(segments)==type([]) and "OR" not in segments:
		newSegments = []
		for segment in segments:
			res, errorMessage = organizeOr(segment,depth+1,debug)
			if type(res)==type(0) and res==-1:
				return [-1, errorMessage]
			else:
				newSegments.append(res)
		return [newSegments, ""]
	# There's an or.
	else:
		newSegments = []
		# We prefix the OR segment with an OR.
		newSegments.append("OR")
		bufferSegments = []
		# Loop through all the segments we got, buffer them, and then output them
		for segment in segments:
			# We found an OR, dump everything in the buffer
			if type(segment)==type("") and segment=="OR":
				# Nothing in the buffer, OR came first, this is bad.
				if not len(bufferSegments):
					pPrint("Error: Or comes at beginning of query.",depth,debug)
					return [-1, "Query error: OR comes at beginning of unprocessed query."]
				# We're good, dump it in the buffer
				else:
					# Recursively process the buffer to make sure it doesn't contain more ORs
					res, errorMessage = organizeOr(bufferSegments,depth+1,debug)
					# Recursive processing failed, dump it.
					if type(res)==type(0) and res==-1:
						return [-1, errorMessage]
					# We got back a list, add it.
					elif len(res)>1:
						newSegments.append(res)
					# We got back an item in a redundant list, just pass-through the item.
					else:
						newSegments.append(res[0])
						
					bufferSegments = []
			# If it's not an OR, then add it to the buffer
			else:
				bufferSegments.append(segment)

		# If we have nothing in the buffer at the end then the query ended with OR
		if not len(bufferSegments):
			pPrint("Error: OR comes at end of query.",depth,debug)
			return [-1, "Query error: OR comes at end of unprocessed query."]
		# Dump the remaining buffer
		else:
			# Recursively process as above
			res, errorMessage = organizeOr(bufferSegments,depth+1,debug)
			# Returned error
			if type(res)==type(0) and res==-1:
				return [-1, errorMessage]
			elif len(res)>1:
				newSegments.append(res)
			else:
				newSegments.append(res[0])

		return [newSegments, ""]

def metaProcessFreeformQuery(query,depth=0,debug=0):
	""" Stage 4 of the processing pipeline. Takes the output of the or processor, dispatches it to the freeform query parser,
	assembles it into a Mongo-ready cluster of data.

	Parameters
	----------
	query : list
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
	qDict = {}
	needScore = 0

	# We got a string, just query it directly
	if type(query)!=type([]) and type(query)==type(""):
		res, needScoreRet, errorMessage = parseFreeformQuery(query)
		if type(res)==type(0) and res==-1:
			return [-1, 0, errorMessage]
		needScore = needScore or needScoreRet
		return [res, needScore, ""]
	else:
		if query[0]=="OR":
			qDict["$or"] = []
			for i in xrange(1,len(query)):
				if type(query[i])==type([]):
					res, needScoreRet, errorMessage = metaProcessFreeformQuery(query[i],depth+1,debug)
					if type(res)==type(0) and res==-1:
						return [-1, 0, errorMessage]
					needScore = needScore or needScoreRet
					qDict["$or"].append(res)
				else:
					res, needScoreRet, errorMessage = parseFreeformQuery(query[i])
					if type(res)==type(0) and res==-1:
						return [-1, 0, errorMessage]
					needScore = needScore or needScoreRet
					qDict["$or"].append(res)
		else:
			if len(query)==1:
				res, needScoreRet, errorMessage = parseFreeformQuery(query[0])
				if type(res)==type(0) and res==-1:
					return [-1, 0, errorMessage]
				needScore = needScore or needScoreRet
				qDict = res
			else:
				qDict["$and"] = []
				for item in query:
					res, needScoreRet, errorMessage = metaProcessFreeformQuery(item, depth+1, debug)
					if type(res)==type(0) and res==-1:
						return [-1, 0, errorMessage]
					needScore = needScore or needScoreRet
					qDict["$and"].append(res)

	return [qDict, needScore, errorMessage]

def parseFreeformQuery(qtext):
	""" Takes an atomic Mongo query (no AND, no OR, no parentheses, etc. Isolates field names and dispatches the fields
	to be assembled.

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

	global fieldTypes
	error=0
	queryField = ""
	queryWords = ""
	needScore = 0
	nSMax = 0
	queryDict = {}

	#print "parsing freeform query: "+qtext

	for word in qtext.split():
		# first we want to find a word with ":" in it
		if ":" in word:
			# Deal with whatever we've got loaded for the old field before assembling the new one.
			if queryField:
				queryDict, needScore, errorMessage = assembleQueryChunk(queryDict, queryField, queryWords)
				nSMax = nSMax or needScore
				# print needScore, nSMax
				if errorMessage:
					error = 1
					break
				queryWords = ""

			queryField, queryWords = word.split(":",1)
			if queryField.lower() not in [key.lower() for key in fieldTypes]:
				errorMessage = "Invalid search field: "+queryField
				# Invalid search field
				error = 1
				break
			else:
				# We're good
				continue
		else:
			if not queryField:
				queryField = "alltext"
				queryWords = word.strip()
				print "assuming alltext search for unspecified field for word "+word
				#errorMessage = "Search query did not specify field to search."
				# Searching in a field when we have nothing
				#error = 1 
				#break
			else:
				queryWords = queryWords + " " + word

	if error==0:
		queryDict, needScore, errorMessage = assembleQueryChunk(queryDict, queryField, queryWords)
		nSMax = nSMax or needScore
		if errorMessage:
			return [-1, 0, errorMessage]
		print "Getting ready to submit final adjudication:"
		print nSMax
		return [queryDict, nSMax, ""]
	else: # Got an error in a chunk
		return [-1, 0, errorMessage]

def assembleQueryChunk(queryDict, queryField, queryWords):
	""" Takes one field and what to query it, ascertains field type, and then builds the query for that field alone. Asks the adder to add field to dict.

	Parameters
	----------
	queryDict : dict
		The existing query dictionary
	queryField : str
		Name of field to query
	queryWords : str
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
	
	print "asked to assemble "+queryField+" / "+queryWords

	global fieldTypes
	queryWords = queryWords.strip()
	if len(queryWords)==0:
		return [queryDict, 0, "Error: Empty search field."]
	
	needScore = 0
	fieldType = "str" if not queryField in fieldTypes else fieldTypes[queryField]
	if fieldType=="flexstr":
		#print "flexible string field, checking for quotation marks to see if we want a literal str or to ask the fulltext search."
		if queryWords.strip()[0]=="[" and queryWords.strip()[-1]=="]":
			queryWords = queryWords[1:-1]

		if queryWords.strip()[0]=="\"" and queryWords.strip()[-1]=="\"":
			queryWords = queryWords[1:-1].lower()
			fieldType = "str"
		else:
			fieldType = "fulltext"

	if fieldType=="alltext":
		if queryWords.strip()[0]=="[" and queryWords.strip()[-1]=="]":
			queryWords = queryWords[1:-1]
		if queryWords.strip()[0]=="\"" and queryWords.strip()[-1]=="\"":
			queryWords = queryWords[1:-1].lower()
			print "alltext to regexp or"
			# Do a fulltext query to isolate candidate superset
			validIdStart = []
			for r in db.voteview_rollcalls.find({"$text": {"$search": queryWords.lower()}}, {"_id": 0, "id": 1}):
				validIdStart.append(r["id"])
			# Add candidate votes to query
			queryDict = addToQueryDict(queryDict, "id", {"$in": validIdStart})
			# Now regex from the candidates
			queryDict = addToQueryDict(queryDict, "$or", [{x: {"$regex": ".*"+queryWords.lower()+".*", "$options": "i"}} for x in fieldTypes if fieldTypes[x] in ["str", "fulltext","flexstr"]])
		        return [queryDict, needScore, ""]
		else:
			print "alltext to fulltext"
			fieldType="fulltext"

	# CODES: Search all code fields
	if fieldType=="codes":
		queryDict = addToQueryDict(queryDict, "$or", [{x: {"$regex": ".*"+queryWords.lower()+".*", "$options": "i"}} for x in fieldTypes if x.startswith("codes.")])
        elif fieldType=="code":
		queryDict = addToQueryDict(queryDict, queryField, {"$regex": ".*"+queryWords.lower()+".*", "$options": "i"})
	elif fieldType=="fulltext":
		queryDict = addToQueryDict(queryDict, "$text", {"$search": queryWords.lower()})
		needScore = 1
	elif fieldType=="str":		
		if queryWords[0]=="\"" and queryWords[-1]=="\"":
			queryWords = queryWords[1:-1]

		# Do a fulltext query to isolate candidate superset.
		validIdStart = []
		for r in db.voteview_rollcalls.find({"$text": {"$search": queryWords.lower()}}, {"_id": 0, "id": 1}):
			validIdStart.append(r["id"])
		# Add candidate votes to query
		queryDict = addToQueryDict(queryDict, "id", {"$in": validIdStart})
		# Now regex from the candidates
		queryDict = addToQueryDict(queryDict, queryField, {"$regex": ".*"+queryWords.lower()+".*", "$options": "i"})

	# STREXACT fields: have to exactly match the full field, was used for 'bill' but no longer
	elif fieldType=="strexact":
		queryDict = addToQueryDict(queryDict, queryField, queryWords.upper())

	# INT can be searched by integer or range
	elif fieldType=="int":
		# Hack: Mapping shorter searches.
		if queryField=="yea":
			queryField="yea_count"
		elif queryField=="nay":
			queryField="nay_count"
		elif queryField=="support":
			queryField="percent_support"

		if " " not in queryWords:
			try:
				queryDict[queryField] = int(queryWords)
			except:
				return [queryDict, 0, "Error: Non-integer search to integer field."]
		elif queryWords[0]=="[" and queryWords[-1]=="]" and "to" in queryWords:
			rangeSet = queryWords[1:-1]
			min, max = [x.strip() for x in rangeSet.split(" to ")]
			queryDict[queryField] = {}
			if len(min):
				try:
					queryDict[queryField]["$gte"] = int(min)
				except:
					return [queryDict, 0, "Error: Non-integer search to integer field."]
			else:
				min = -99

			if len(max):
				try:
					queryDict[queryField]["$lte"] = int(max)
				except:
					return [queryDict, 0, "Error: Non-integer search to integer field."]
			else:
				max = 999

			if int(max)<int(min):
				return [queryDict, 0, "Error: Maximum value of field "+str(queryField)+" cannot be lower than minimum value."]
                else:
			try:
				vals = [int(val) for val in queryWords.split()]
			except:
				return [queryDict, 0, "Error: Non-integer search to integer field."]
			queryDict[queryField] = {}
			queryDict[queryField]["$in"] = vals
	# VOTER type: Does the voter exist in the vote?
	elif fieldType=="voter":
		nameSet = queryWords.split(" ")
		for name in nameSet:
			try:
				name = int(name)
				print "i'm here with name ", name
				queryDict = addToQueryDict(queryDict, "votes.icpsr", name)
			except:
				errorMessage = "Error: invalid member ID in voter search."
				return [queryDict, 0, errorMessage]
	
	# KEYVOTE type: Is this a key vote?
	elif fieldType=="key_flags":
                if queryWords == "1":
                        queryDict["key_flags"] = {"$exists": 1}
                elif queryWords == "CQ":
                        queryDict["key_flags"] = {"$in": [queryWords]}

	# CHAMBER type: Senate or House?
	elif fieldType=="chamber":
		chamber = queryWords.strip()
		if not any(x == chamber.lower() for x in ["senate", "house"]):
			errorMessage = "Error: invalid chamber provided in search."
			return [queryDict, 0, errorMessage]
		else:
			queryDict = addToQueryDict(queryDict, "chamber", queryWords.title())

	# Saved fields: pull all the votes associated with a saved stash, and limit to those.
	elif fieldType=="saved":
		savedId = queryWords.strip()
		res = db.stash.find_one({'id': savedId})
		if not res:
			validIds = [-1]
		else:
			validIds = []
			if "votes" in res:
				validIds = validIds + res["votes"]
			if "old" in res:
				validIds = list(set(validIds + res["old"]))
			queryDict = addToQueryDict(queryDict, "id", {"$in": validIds})

	# DATE fields: handle three kinds of date searches, some exact range or values, and then greater or less than
	# todo: check if startdate and enddate entered are not in the right order
	# have to check with Aaron about whether this will only check within a level of the query
	# because it is OK to have a startdate be later than an enddate if the two are in different
	# parts of the query that have been joined by an OR
	elif fieldType=="date":
		dateQuery = queryWords.strip()
		nextyear = str(date.today().year + 1)

		if " " not in dateQuery:
			if checkDate(queryWords):
				if queryField == "dates":
					queryDict["date"] = dateQuery
				elif queryField == "startdate":
					if "date" not in queryDict:
						queryDict["date"] = {}
					if queryWords < "1787-01-01":
						queryDict["date"]["$gte"] = "1787-01-01"
					else:
						queryDict["date"]["$gte"] = dateQuery
				elif queryField == "enddate":
					if "date" not in queryDict:
						queryDict["date"] = {}
					if dateQuery > nextyear + "-01-01":
						queryDict["date"]["$lte"] = nextyear + "-01-01"
					else:
						queryDict["date"]["$lte"] = dateQuery
			else:
				return [queryDict, 0, "Error: Date field not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
		elif queryField != "dates":
			return [queryDict, 0, "Error: 'startdate' and 'enddate' only take a single date as YYYY or YYYY-MM-DD."]
	
		elif dateQuery[0]=="[" and dateQuery[-1]=="]" and "to" in dateQuery:
			rangeSet = dateQuery[1:-1]
			min, max = [x.strip() for x in rangeSet.split(" to ")]
			if "date" in queryDict:
				return [queryDict, 0, "Error: only use the range in 'dates' or 'startdate' and 'enddate', not both"]
			else:
				queryDict["date"] = {}
			if len(min):
				if checkDate(min):
					queryDict["date"]["$gte"] = min
				else:
					return [queryDict, 0, "Error: Date field not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
			else:
				min = "0000"
			if len(max):
				if checkDate(max):
					queryDict["date"]["$lte"] = max
				else:
					return [queryDict, 0, "Error: Date field not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
			else:
				max = "9999"

			if max < min:
				return [queryDict, 0, "Error: Maximum value of field "+str(queryField)+" cannot be lower than minimum value."]
				
                else:
			if all([checkDate(d) for d in dateQuery.split()]):
				dates = dateQuery.split()	
			else:
				return [queryDict, 0, "Error: A date is not formatted properly. Remember, use YYYY or YYYY-MM-DD."]
			queryDict["date"] = {}
			queryDict["date"]["$in"] = dates

	else:
		errorMessage = "Error: invalid field for search: "+queryField
		return [queryDict, 0, errorMessage]

	print "final ns for this tier", needScore
	return [queryDict, needScore, ""]

def addToQueryDict(queryDict, queryField, toAdd):
	""" Adds a query to the query dictionary. We need this because of how Mongo handles two queries hitting the same field.
	Example: description: tax description: iraq
	Proceeds in the following manner:
		1) If the query dict has this field, we've searched for it before. Delete from the query dictionary and add both
		the old search and the new search into an AND statement.
		2) If the query dict has an AND field, maybe we've searched for this twice before.
			2a) The and field has the thing we're searching for: add the new search to the and.
			2b) The and field does not have the thing we're searching for (no prior searches for this field):
				Just add field to the base search.
		3) If the query dict doesn't have the field or an AND statement, then just add field to base search

	TODO: Implement proper error handling

	Parameters
	----------
	queryDict : dict
		The existing query dictionary
	queryField : str
		Name of field to query
	queryWords : str
		Exactly what we're quering

	Returns
	-------
	dict
		The updated query dictionary
	"""
	# We are already querying this exactly once (i.e. this is a our second search for a given description)
	if queryField in queryDict:
		# Take the current search, remove it
		prevVal = queryDict[queryField]
		del queryDict[queryField]
		# Add both to an and statement
		queryDict["$and"] = [{queryField: prevVal}, {queryField: toAdd}]
	# We're querying something at least twice, is it the thing we're looking for?
	elif "$and" in queryDict:
		found = 0
		for andItem in queryDict["$and"]:
			# Iterating through our compound and
			if type(andItem) == type({}):
				# Is it our item?
				if queryField in andItem:
					found=1 # It is
					break
			# Something in the and statement is not a dict? Error?
			else:
				return {}
				print "huh?"

		# We already have at least two of the same field, add this one into the mix of the and statement
		if found==1:
			queryDict["$and"].append({queryField: toAdd})
		# We have zero of the field, add this at the top level of the query
		elif queryField not in queryDict:
			queryDict[queryField] = toAdd
		# This shouldn't happen
		else:
			print "huh?"
	else:
		queryDict[queryField] = toAdd

	return queryDict

def query(qtext, startdate=None, enddate=None, chamber=None, 
          flds = ["id", "Issue", "Peltzman", "Clausen", "description", "descriptionLiteral",
                  "descriptionShort", "descriptionShortLiteral"],
          icpsr=None, rowLimit=5000, jsapi=0, rapi=0, sortDir=-1, sortSkip=0, sortScore=1, sortRoll=0, idsOnly=0,
	  request=None):
	""" Takes the query, deals with any of the custom parameters coming in from the R package,
	and then dispatches freeform text queries to the query dispatcher.

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
		Taking ICPSR number as possible argument to directly passthrough the person's votes.
	jsapi: int
		Is this an API call from the Javascript API?
		We do this to determine whether we should be returning paginated data
		or returning as much as we can and erroring if the rowLimit is violated.
	sortDir: int
		Sort by date reversed or sort by date ascending
	sortSkip: int
		Pagination is slow as hell in MongoDB, so we can take a maximum ID to make
		mock pagination. Then, we should return a "nextID" parameter for the next page.
	request: Bottle.request Object
		Passes user request details to the log/quota module; if none, assume command line.
	
	Returns
	-------
	dict
		Dict of results to be run through json.dumps for later output
	"""

	quotaCheck = logQuota.checkQuota(request) # Are we over quota?
	if quotaCheck["status"]: # Yes, so error out
		return {"recordcount": 0, "rollcalls": [], "errormessage": quotaCheck["errormessage"]}

	if qtext:
		qtext = qtext.encode('utf-8')
	else:
		qtext = ""
	baseRowLimit = rowLimit

	print qtext
	beginTime = time.time()
	global db
	queryDict = {}
	needScore = 0
	# Process the date
	if startdate is None and enddate is None and chamber is None and qtext is None and not jsapi:
		logQuota.addQuota(request, 1) # Add to quota.
		logQuota.logSearch(request, {"query": "", "resultNum": -1}) # Log the failed search: No search
		return { 'recordcount':0,'rollcalls':[],'errormessage':"No query specified."} # Return the regular error.

	if startdate is not None or enddate is not None:
		nextyear = str(date.today().year + 1)
		if startdate or enddate:
			queryDict["date"] = {}
		if startdate:
			if startdate<"1787-01-01":
				queryDict["date"]["$gte"] = "1787-01-01"
			else:
				queryDict["date"]["$gte"] = startdate
		if enddate:
			if enddate>nextyear+"-01-01":
				queryDict["date"]["$lte"] = nextyear+"-01-01"
			else:
				queryDict["date"]["$lte"] = enddate
		if startdate and enddate and startdate>enddate:
			logQuota.addQuota(request, 1) # Add to quota
			logQuota.logSearch(request, {"query": "Invalid query: Start date after emd date.", "resultNum": -1}) # Log the failed search: No search
			return { 'recordcount':0,'rollcalls':[],'errormessage':"Start Date should be on or before End Date"}

	# Process the chamber
	if chamber is not None:
		chamber = chamber.title()
		if chamber=="S":
			chamber="Senate"
		elif chamber=="H":
			chamber="House"
		if chamber not in ["House","Senate"]:
			logQuota.addQuota(request, 1) # Add to quota
			logQuota.logSearch(request, {"query": "Invalid query: Invalid chamber", "resultNum": -1}) # Log the failed search: no search
			return { 'recordcount':0,'rollcalls':[],'errormessage':"Invalid chamber entered. Chamber can be \"House\" or \"Senate\"."}

		queryDict["chamber"] = chamber

	if qtext and len(qtext):
		try:
			from urllib import unquote_plus
			qtext = unquote_plus(qtext)
		except:
			logQuota.addQuota(request, 1)
			logQuota.logSearch(request, {"query": "Invalid query: Character encoding error?", "query_extra": qtext, "resultNum": -1})
			return { 'recordcount':0,'rollcalls':[],'errormessage':'Error resolving query string.'}

		wordSet = [x.lower() for x in qtext.split()]
		anyWords = 0
		if all([w.lower() in stopWords for w in wordSet]):
			logQuota.addQuota(request, 1)
			logQuota.logSearch(request, {"query": "Invalid Query: All words on stoplist.", "query_extra": qtext, "resultNum": -1})
			return { 'recordcount':0, 'rollcalls':[], 'errormessage':"All the words you searched for are too common. Please be more specific with your search query."}

		if len(qtext)>2500:
			logQuota.addQuota(request, 1)
			logQuota.logSearch(request, {"query": "Invalid Query: Too long.", "query_extra": qtext, "resultNum": -1})
			return { 'recordcount':0,'rollcalls':[],'errormessage':"Query is too long. Please shorten query length."}

		try:
			#print qtext
			newQueryDict, needScore, errorMessage = queryDispatcher(qtext)
			print newQueryDict
			#print errorMessage
			if errorMessage:
				print "Error parsing the query"
				print errorMessage
				logQuota.addQuota(request, 1)
				logQuota.logSearch(request, {"query": "Invalid Query; parsing issue.", "query_extra": qtext, "resultNum": -1})
				return {'recordcount':0,'rollcalls':[],'errormessage':errorMessage}
		except Exception as e:
			print traceback.format_exc()
			logQuota.addQuota(request, 1)
			logQuota.logSearch(request, {"query": "Invalid Query; parsing issue.", "query_extra": qtext, "resultNum": -1})
			return { 'recordcount':0,'rollcalls':[],'errormessage':"Error parsing freeform query. We are working on building out query debug messages to provide better feedback.", 'detailederror': traceback.format_exc(), 'q': qtext}

		try:
			z = queryDict.copy()
			z.update(newQueryDict)
			queryDict = z
		except:
			pass

	if icpsr is not None:
		queryDict["votes.id"] = icpsr

	# Get results
	if not idsOnly:
		fieldReturns = {"codes.Clausen":1,"codes.Peltzman":1,"codes.Issue":1,
				"description":1,"congress":1,"rollnumber":1,"date":1,"bill":1,"chamber":1,
				"yea_count":1,"nay_count":1,"percent_support":1,
				"vote_counts":1, "_id": 0, "id": 1, "date_chamber_rollnumber": 1, "key_flags": 1,
				"vote_desc": 1, "vote_document_text": 1, "short_description": 1, "vote_question": 1, "question": 1, "vote_result":1,
                                'vote_title': 1, 'vote_question_text': 1, 'amendment_author': 1, "vote_description": 1, "bill_number": 1, "sponsor": 1}
	else:
		fieldReturns = {"id": 1, "_id": 0, "date_chamber_rollnumber": 1}

	if needScore:
		fieldReturns["score"] = {"$meta": "textScore"}

	quotaCost=0
	votes = db.voteview_rollcalls
	try:
		sortSkip = int(sortSkip)
	except:
		sortSkip = 0

	if sortSkip and not needScore:
		if sortDir==-1:
			queryDict["date_chamber_rollnumber"] = {"$lt": sortSkip}
		else:
			queryDict["date_chamber_rollnumber"] = {"$gt": sortSkip}

	#print queryDict
	# Need to sort by text score
	if needScore:
		try:
			resCount = votes.find(queryDict,fieldReturns).count()
			rowLimit = baseRowLimit
			if not jsapi:
				results = votes.find(queryDict,fieldReturns).limit(rowLimit+5)
			else:
				if sortScore:
					results = votes.find(queryDict,fieldReturns).sort([("score", {"$meta": "textScore"})]).skip(sortSkip).limit(rowLimit+5)
                                else:
					results = votes.find(queryDict,fieldReturns).sort("date_chamber_rollnumber", sortDir).skip(sortSkip).limit(rowLimit+5)
		except pymongo.errors.OperationFailure, e:
			try:
				junk, mongoErr = e.message.split("failed: ")
				if "many text expressions" in mongoErr:
					logQuota.addQuota(request, 1)
					logQuota.logSearch(request, {"query": "Invalid Query: Multiple full-text.", "query_extra": queryDict, "resultNum": -1})
					return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Search queries are limited to one full-text search. Please use quotation marks to search for exact matches or simplify search query.'}
				else:
					logQuota.addQuota(request, 1)
					logQuota.logSearch(request, {"query": "Invalid Query: Unknown error", "query_extra": queryDict, "resultNum": -1})
					return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Error during database query. Detailed error: '+mongoErr}
			except:
				print traceback.format_exc()
				logQuota.addQuota(request, 1)
				logQuota.logSearch(request, {"query": "Invalid Query: Unknown error.", "query_extra": queryDict, "resultNum": -1})
				return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Unknown error during database query. Please check query syntax and try again.'}
		except:
			print traceback.format_exc()
			logQuota.addQuota(request, 1)
			logQuota.logSearch(request, {"query": "Invalid Query: Unknown error.", "query_extra": queryDict, "resultNum": -1})
			returnDict = {"rollcalls": [], "recordcount": 0, "errormessage": "Invalid query."}
			return returnDict			
	else:
		try:
			resCount = votes.find(queryDict,fieldReturns).count()
			rowLimit = baseRowLimit
			if not jsapi:
				results = votes.find(queryDict,fieldReturns).limit(rowLimit+5)
			else:
                                sortBy = "date_chamber_rollnumber" if not sortRoll else "rollnumber"
				results = votes.find(queryDict, fieldReturns).sort(sortBy, sortDir).limit(rowLimit+5)
		except pymongo.errors.OperationFailure, e:
			try:
				junk, mongoErr = e.message.split("failed: ")
				logQuota.addQuota(request, 1)
				logQuota.logSearch(request, {"query": "Invalid Query: Unknown error: "+mongoErr, "query_extra": queryDict, "resultNum": -1})
				return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Error during database query. Detailed error: '+mongoErr}
			except:
				logQuota.addQuota(request, 1)
				logQuota.logSearch(request, {"query": "Invalid Query: Unknown error.", "query_extra": queryDict, "resultNum": -1})
				return {'rollcalls': [], 'recordcount': 0, 'errormessage': 'Unknown error during database query. Please check query syntax and try again.'}
		except:
			print traceback.format_exc()
			logQuota.addQuota(request, 1)
			logQuota.logSearch(request, {"query": "Invalid Query: Unknown error", "query_extra": queryDict, "resultNum": -1})
			returnDict = {"rollcalls": [], "recordcount": 0, "errormessage": "Invalid query."}
			return returnDict

	# Mongo lazy-allocates results, so we need to loop to pull them in
	mr = []
	nextId = 0
	maxScore = 0
	for res in results:
                # Apply waterfall to text if jsapi
                if jsapi or rapi:
                        res["text"] = waterfallText(res)
                        res["question"] = waterfallQuestion(res)
		if not maxScore and needScore and res["score"]>=maxScore:
			maxScore = res["score"]

		if len(mr)<rowLimit:
			if "date_chamber_rollnumber" in res:
				del res["date_chamber_rollnumber"]
			if not needScore:
				mr.append(res)
			elif res["score"]>= SCORE_THRESHOLD and res["score"]>=SCORE_MULT_THRESHOLD * maxScore:
				mr.append(res)
			else:
				nextId = 0
				break
		else:
			if not needScore:
				nextId = str(res["date_chamber_rollnumber"])
			else:
				nextId = sortSkip + rowLimit
			break

	if needScore:
		keyvoteBoost = 2
		mr.sort(key=lambda x: -x["score"] - keyvoteBoost*int(bool(x.get("key_flags",[]))))

	# Get ready to output
	returnDict = {}
	returnDict["needScore"] = needScore
	returnDict["rollcalls"] = mr
	returnDict["recordcount"] = len(mr)
	returnDict["recordcountTotal"] = resCount
	returnDict["apiversion"] = "Q3 2017-01-08"
	returnDict["nextId"] = nextId 
	if "$text" in queryDict:
		returnDict["fulltextSearch"] = [v for k, v in queryDict["$text"].iteritems()][0]

	if resCount>rowLimit:
		returnDict["rollcalls"] = mr[0:rowLimit]
		if not jsapi:
			returnDict["errormessage"] = "Error: Query returns more than "+("{:,d}".format(rowLimit))+" results."
	endTime = time.time()
	elapsedTime = endTime - beginTime
	returnDict["elapsedTime"] = round(elapsedTime,3)

	# Quota cost depends on execution time.
	if elapsedTime>10:
		logQuota.addQuota(request, 10)
		logQuota.logSearch(request, {"query": queryDict, "query_extra": "Very slow query", "resultNum": resCount})
	elif elapsedTime>2:
		logQuota.addQuota(request, 2)
		logQuota.logSearch(request, {"query": queryDict, "query_extra": "Slow query", "resultNum": resCount})
	else:
		logQuota.addQuota(request, 1)
		logQuota.logSearch(request, {"query": queryDict, "resultNum": resCount})

	print len(returnDict["rollcalls"]),
	print resCount
	return returnDict

if __name__ == "__main__":
	start = time.time()
	if len(sys.argv)>1:
		args = " ".join(sys.argv[1:])
		print query(args)		
	else:
		#results = query("(nay:[0 to 9] OR nay:[91 to 100] OR yea:[0 to 5]) AND congress:112", rowLimit=5000)
		#print results
		#results = query("saved: 3a5c69e7")
		#print results

		#results1 = query("tax", startdate = "2010")
		#results2 = query("tax startdate:2010")


		#results3 = query("tax", startdate = "2008-04-07", enddate = "2013-03-03") results4 = query("tax startdate:2008-04-07 enddate:2013-03-03 dates:[2013 to 2015]")
		#results = query("voter: MS29940114")
		#print results
		#results = query('"defense commissary"')
		#print results
		#print query("congress:113 chamber:House", idsOnly = 1)
		print query("the and")
		#query("(((description:tax))") # Error in stage 1: Imbalanced parentheses
		#query("((((((((((description:tax) OR congress:113) OR yea:55) OR support:[50 to 100]) OR congress:111))))))") # Error in stage 1: Excessive depth
		#query("(description:tax OR congress:1))(") # Error in stage 1: Mish-mash parenthesis
		#query("OR description:tax OR") # Error in stage 2: OR at wrong part of message.
		#query("iraq war test")
		#query("\"iraq war test\"")
		#query("description:tax",startdate="1972-01-01",enddate="1973-01-01",chamber="senate")
		#query("shortdescription:Iraq congress:113", chamber = "house")
		#query("shortdescription:Iraq congress:[112 to 113]", startdate="1800-01-01", enddate="2200-01-01", chamber="house")
		#query("shortdescription:Iraq congress:112 113", chamber = "house")
		#query("estate tax congress:113")
		#query("alltext:tax")
		#query("rhodesia bonker amendment")
		#query("\"estate tax\" congress:110")
		#query("codes:energy")
		#query("congress: ")
		#query("((description: \"tax\" congress: 113) OR congress:114 OR (voter:MH085001 AND congress:112) OR congress:[55 to 58]) AND support:[58 to 100]")
		#query("((description: \"tax\" congress: 113) OR congress:114 OR (voter:MH085001 AND congress:112) OR congress:[55 to 58]) AND description:\"iraq\"")
		#query("voter: MS05269036 MS02793036 MS02393036 OR congress:[113 to ]")
		#query("iraq war")
		#query("iraq war AND congress:113")
		#query("\"estate tax\" congress:110")
		#print "ok2"
		#query("\"war on terrorism\"")
		#query('"war on terrorism" iraq')
		#query("alltext:afghanistan iraq OR codes:defense")
	end = time.time()
	print (end-start)
