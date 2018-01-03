import os

import model.slugify
from model.utils import get_congress_first_year, assoc

from pdb import set_trace as st

ROLLCALL_SEARCHABLE_FIELDS = [
    'amendment_author',
    'bill_number',
    'cg_official_titles',
    'cg_short_titles_for_portions',
    'cg_summary',
    'chamber',
    # 'congress',
    'description',
    'dtl_desc',
    'dtl_sources',
    # 'id',
    'question',
    # 'rollnumber',
    'short_description',
    # 'sponsor',
    'vote_desc',
    'vote_description',
    'vote_document_text',
    'vote_question',
    'vote_question_text',
    'vote_title',
]

MEMBER_SEARCHABLE_FIELDS = [
    'bioname',
    'bioguide_id',
    'biography',
]


def make_range_filter(user_query, name):
    range_filter = {}
    try:
        range_filter['gte'] = user_query['from_' + name]
    except KeyError:
        pass
    try:
        range_filter['lte'] = user_query['to_' + name]
    except KeyError:
        pass
    return {'range': {name: range_filter}}


def make_range_filters(user_query):
    range_filters = []
    range_filters.append(make_range_filter(user_query, 'date'))
    range_filters.append(make_range_filter(user_query, 'congress'))
    return range_filters


def make_filters(user_query):
    filters = {}
    filters['bool'] = {'must': make_range_filters(user_query)}
    return filters


def build_rollcall_query(user_query, filters):
    query = {
        'query': {
            'bool': {
                'filter': filters,
                'should': {
                    'multi_match': {
                        'query': user_query,
                        'fields': ROLLCALL_SEARCHABLE_FIELDS,
                    }
                },
            }
        }
    }
    return query


def build_member_query(user_query, filters):
    query = {
        'query': {
            'bool': {
                # 'filter': filters,
                'should': {
                    'multi_match': {
                        'query': user_query,
                        'fields': MEMBER_SEARCHABLE_FIELDS,
                    }
                },
            }
        }
    }
    return query


def extract_documents(elastic_query_result):
    hits = elastic_query_result['hits']['hits']
    return [hit['_source'] for hit in hits]


def get_rollcalls(client, user_query):
    query = user_query['q']
    filters = make_filters(user_query)
    elastic_query = build_rollcall_query(query, filters)

    elastic_result = client.search(index='rollcall', body=elastic_query)
    return extract_documents(elastic_result)


def build_seo_name(member):
    return model.slugify.slugify(member['bioname'])


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
    filters = make_filters(user_query)
    elastic_query = build_member_query(query, filters)
    elastic_result = client.search(index='member', body=elastic_query)
    members = extract_documents(elastic_result)
    return [process_member(member) for member in members]
