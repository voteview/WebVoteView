import re
from stemming.porter2 import stem

def do_highlight(highlighter, text):
	""" Takes a string and words to highlight. """

	# Load stopwords to ignore.
    	stopwords = [x.strip() for x in open("model/stop_words.txt","r").read().split("\n")]

	# Nothing to highlight, return text unchanged
	if not len(highlighter):
		return text

	# Split words
	words = highlighter.split()
	stem_list = []
	re_query = r"(%s)" % highlighter
	for word in words:
		if len(word) > 2:
			re_query += "|(%s)" % word
			if stem(word) != word:
				stem_list.append(stem(word))

	# Add stemmed versions of words.
	for stem_word in stem_list:
		if len(stem_word)>2:
			re_query += "|(%s)" % stem_word

	# Find all the matches
	spans = [m for m in re.finditer(re_query, text, re.I)]
	new_string = ""
	last = 0

	# Run through the results and highlight them accordingly.
	for s in spans:
		ternary = "" if s.lastindex == 1 else "2" if s.lastindex <= 1 + len(stem_list) else "3"

		if not text[s.start():s.end()].lower() in stopwords:
			new_string += text[last:s.start()] + '<span class="searchHighlight%s">%s</span>' % (ternary, text[s.start():s.end()])
		else:
			new_string += text[last:s.start()] + ' ' + text[s.start():s.end()]

		last = s.end()

	# Add the text after the last result.
	new_string += text[last:]

	# Return the modified string.
	return new_string
