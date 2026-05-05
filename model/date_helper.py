""" Helpers dealing with dates. """

import datetime


def fix_date(date_text_in, format_out="%B %d, %Y"):
    """ Converts dates from Y-m-d to B d, Y """

    in_obj = datetime.datetime.strptime(date_text_in, "%Y-%m-%d")
    return in_obj.strftime(format_out)


def format_article_date(date_text_in, format_out="%B %d, %Y"):
    """
    Format an article's original_date. The metadata isn't normalized — most
    entries are YYYY-MM-DD but a few are M/D/YYYY. Falls back to the raw
    string if neither parses.
    """
    if not date_text_in:
        return ""
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%-m/%-d/%Y"):
        try:
            return datetime.datetime.strptime(
                date_text_in, fmt).strftime(format_out)
        except ValueError:
            continue
    return date_text_in
