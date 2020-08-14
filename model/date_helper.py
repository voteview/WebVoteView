""" Helpers dealing with dates. """

import datetime


def fix_date(date_text_in, format_out="%B %d, %Y"):
    """ Converts dates from Y-m-d to B d, Y """

    in_obj = datetime.datetime.strptime(date_text_in, "%Y-%m-%d")
    return in_obj.strftime(format_out)
