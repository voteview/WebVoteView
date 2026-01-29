""" Helpers to pull metadata from metadata database. """
from model.config import db, get_cached_metadata


def meta_lookup(api=""):
    """
    Pull metadata from database.
    Uses in-memory caching for faster page loads.
    """
    # Use cached metadata for common lookups (no api or Web_Members)
    if not api:
        cached = get_cached_metadata()
        if cached:
            return cached

    # Fall back to direct query for specific API needs
    if not api:
        return_dict = {"loyalty_counts": 0}
    elif api == "Web_Members":
        return_dict = {"nominate": 0}

    for meta_attribute in db.voteview_metadata.find(
            {},
            return_dict).sort('time', -1).limit(1):
        meta = meta_attribute

    return meta
