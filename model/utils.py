"""Functional utilities for models."""


def assoc(mapping, name, value):
    """Add a key-value pair to a dict."""
    new_mapping = mapping.copy()
    new_mapping[name] = value
    return new_mapping


def merge_dicts(dict1, dict2):
    """Return a new dict with the keys and values of both dicts."""
    new = dict1.copy()
    new.update(dict2)
    return new


def rename_key(mapping, key, name):
    """Return dict with key renamed to new name."""
    new = mapping.copy()
    new[name] = new.pop(key)
    return new


def filter_first(dicts, key):
    """Filter dicts to get first item having each value for key."""
    values_seen = set()
    for item in dicts:
        if item[key] not in values_seen:
            yield item
            values_seen.add(item[key])


def get_congress_first_year(congress):
    """Return the first year of a congress."""
    return 1789 + 2 * (congress - 1)


def get_congress_last_year(congress):
    """Return the last year of a congress."""
    return 1789 + 2 * (congress - 1) + 1
