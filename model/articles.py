""" Functions involved in the display of blog articles. """
import json
from operator import itemgetter

with open('static/articles/article_metadata.json', 'r') as file:
    article_metadata = json.load(file)

def get_article_meta(slug):
    """ Return article metadata by slug. """
    result = [res for res in article_metadata if res['slug'] == slug]
    return len(result)==1 and result[0] or None

def list_articles(tag_cat):
    """ List all articles in a given category. """
    
    sort_clause = "title" if tag_cat in ["data", "help"] else "date_modified"
    reverse_dir = tag_cat in ["data", "help"] 
    store_results = []
    selected_articles = [art for art in article_metadata if 
                         (tag_cat in art['tags'] or True) and  # Hack out tag selector for now!
                         (not "hidden" in art or art['hidden'] != 1)] 
    for row in sorted(selected_articles, key=itemgetter(sort_clause), reverse=reverse_dir):  
        store_results.append(row)
    return store_results

