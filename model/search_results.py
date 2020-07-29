""" Helpers that augment search results (highlighting) """

import re
from stemming.porter2 import stem
from model.config import config


def do_highlight(highlighter, text):
    """ Takes a string and words to highlight. """

    # Load stopwords to ignore.
    stopwords = [x.strip() for x in config["stop_words"]]

    # Nothing to highlight, return text unchanged
    if not highlighter:
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
        if len(stem_word) > 2:
            re_query += "|(%s)" % stem_word

    # Find all the matches
    spans = [m for m in re.finditer(re_query, text, re.I)]
    new_string = ""
    last = 0

    # Run through the results and highlight them accordingly.
    for subs in spans:
        ternary = ("" if subs.lastindex == 1 else
                   "2" if subs.lastindex <= 1 + len(stem_list) else "3")

        if not text[subs.start():subs.end()].lower() in stopwords:
            new_string += (
                text[last:subs.start()] +
                '<span class="searchHighlight%s">%s</span>' %
                (ternary, text[subs.start():subs.end()]))
        else:
            new_string += (text[last:subs.start()] + ' ' +
                           text[subs.start():subs.end()])

        last = subs.end()

    # Add the text after the last result.
    new_string += text[last:]

    # Return the modified string.
    return new_string
