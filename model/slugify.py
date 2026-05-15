""" Helpers to convert names and article names to slugs. """

import re
import unidecode


def linear_name(text):
    """ Linearize a name (e.g. McCain, John to John McCain) """
    if "," in text:
        chunks = text.split(", ")
        if len(chunks) >= 3:
            new_text = ("%s %s, %s" %
                        (chunks[1], chunks[0], " ".join(chunks[2:])))
        else:
            new_text = "%s %s" % (chunks[1], chunks[0])
        return new_text.strip()
    else:
        return text


def slugify(text):
    """ Change text strings to SEO-friendly link strings. """
    text = unidecode.unidecode(text).lower()
    text = linear_name(text)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip()
    text = re.sub(r"[-]+", "-", text)
    text = re.sub(r"[-]$", "", text)
    return text
