""" Functions involved in the display of blog articles. """
from model.config import db, get_cached_articles


def get_article_meta(slug):
    """
    Return article metadata by slug.
    First checks cache, then falls back to DB query.
    """
    # Try to find in cache first
    cached_articles = get_cached_articles()
    if cached_articles:
        for article in cached_articles:
            if article.get("slug") == slug:
                return article

    # Fall back to direct query if not in cache
    result = db.voteview_articles.find_one(
        {"slug": slug, "hidden": {"$ne": 1}},
        {"_id": 0}
    )
    return result


def list_articles(tag_category):
    """
    List all articles in a given category.
    Uses cache when possible.
    """
    sort_clause = "title" if tag_category in ["data", "help"] else "date_modified"
    sort_dir = 1 if tag_category in ["data", "help"] else -1

    # Try to filter from cache first
    cached_articles = get_cached_articles()
    if cached_articles:
        filtered = [a for a in cached_articles if tag_category in a.get("tags", [])]
        # Sort the filtered results
        filtered.sort(
            key=lambda x: x.get(sort_clause, ""),
            reverse=(sort_dir == -1)
        )
        return filtered

    # Fall back to direct query
    rows = db.voteview_articles.find(
        {"hidden": {"$ne": 1}, "tags": tag_category}
    ).sort(sort_clause, sort_dir)

    store_results = []
    for row in rows:
        store_results.append(row)

    return store_results


def list_all_articles():
    """
    List all non-hidden articles.
    Uses in-memory caching for faster page loads.
    """
    return get_cached_articles()
