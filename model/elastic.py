import os

import slugify
from model.utils import get_congress_first_year

from pdb import set_trace as st


def build_simple_query(user_query):
    query = {
        'query': {
            'simple_query_string': {
                'query': user_query
            },
        }
    }
    return query


def extract_documents(elastic_query_result):
    hits = elastic_query_result['hits']['hits']
    return [hit['_source'] for hit in hits]


def get_rollcalls(client, user_query):

    elastic_query = build_simple_query(user_query['q'])

    elastic_result = client.search(index='rollcall', body=elastic_query)
    return extract_documents(elastic_result)


def assoc(mapping, name, value):
    """Add a key-value pair to a dict."""
    new_mapping = mapping.copy()
    new_mapping[name] = value
    return new_mapping


def build_seo_name(member):
    return slugify.slugify(member['bioname'])


def build_bioimg_path(member):
    dirpath = 'static/img/bios/'
    path = dirpath + '{:06}.jpg'.format(member['icpsr'])
    if os.path.isfile(path):
        return path
    return dirpath + 'silhouette.png'


def build_min_elected(member):
    return get_congress_first_year(member['congress'])


def process_member(member):
    new_member = member.copy()
    new_member['seo_name'] = build_seo_name(new_member)
    new_member['bioImg'] = build_bioimg_path(new_member)
    new_member['minElected'] = build_min_elected(new_member)
    new_member['state'] = new_member['state_abbrev']
    return new_member


def get_members(client, user_query):
    query = user_query['q']
    elastic_query = build_simple_query(query)
    elastic_result = client.search(index='member', body=elastic_query)
    members = extract_documents(elastic_result)
    return [process_member(member) for member in members]
