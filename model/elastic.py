from __future__ import print_function
from collections import defaultdict
import os
import itertools
from pprint import pprint
import json

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
    range_filter = {k: v for k, v in range_filter.items() if v}
    if any(range_filter.values()):
        return {'range': {name: range_filter}}
    return None


def make_range_filters(user_query):
    range_filters = []
    fields = ['date', 'congress', 'percent_support']
    for field in fields:
        range_filter = make_range_filter(user_query, field)
        if range_filter is not None:
            range_filters.append(range_filter)
    return range_filters


def make_chamber_filter(user_query):
    try:
        chambers = user_query['chamber']
    except KeyError:
        return []
    return [{'match': {'chamber': chamber}} for chamber in chambers]


def make_subject_codes_filters(user_query):
    try:
        clausen_codes = user_query['clausen']
    except KeyError:
        return []
    return [{'match': {'codes.Clausen': clausen_codes[0]}}]


def make_key_vote_filter(user_query):
    try:
        flags = user_query['keyvote']
    except KeyError:
        return []
    return [{'match': {'key_flags': flags}}]


def make_filters(user_query):

    filters = defaultdict(list)

    range_filters = make_range_filters(user_query)
    if range_filters:
        filters['must'] += range_filters

    key_vote_filters = make_key_vote_filter(user_query)
    if key_vote_filters:
        filters['should'] += key_vote_filters

    chamber_filter = make_chamber_filter(user_query)
    if chamber_filter:
        filters['should'] += chamber_filter

    subject_codes_filters = make_subject_codes_filters(user_query)
    if subject_codes_filters:
        filters['should'] += subject_codes_filters

    result = {'bool': dict(filters)}
    return result


def extract_documents(elastic_query_result):

    hits = elastic_query_result['hits']['hits']
    return [hit['_source'] for hit in hits]


def make_sort(user_query):
    temporal_sort_order = {-1: 'desc', 1: 'asc'}[int(user_query['sort_d'])]
    return {'date_chamber_rollnumber': temporal_sort_order}


def build_rollcall_query(user_query):
    text_query = user_query['q']
    filters = make_filters(user_query)

    sort = make_sort(user_query)
    query = {
        'query': {
            'bool': {
                'filter': filters,
                'must': {
                    'multi_match': {
                        'query': text_query,
                        'fields': ROLLCALL_SEARCHABLE_FIELDS,
                    }
                },
            }
        },
        'sort': sort,
        'from': user_query.get('from', 0),
        'size': 20,
        'explain': True,

    }
    return query


def explain(result):
    hits = result['hits']['hits']
    return [hit['_explanation'] for hit in hits]


def get_rollcalls(client, user_query):
    elastic_query = build_rollcall_query(user_query)
    print('Elasticsearch query: ')
    print(json.dumps(elastic_query, indent=2))
    elastic_result = client.search(index='rollcall', body=elastic_query)
    documents = extract_documents(elastic_result)
    return documents


def build_member_query(user_query):
    text_query = user_query['q']
    filters = make_filters(user_query)
    query = {
        'query': {
            'bool': {
                'filter': filters,
                'should': {
                    'multi_match': {
                        'query': text_query,
                        'fields': MEMBER_SEARCHABLE_FIELDS,
                    }
                },
            },
        },
    }
    return query


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
    elastic_query = build_member_query(user_query)
    elastic_result = client.search(index='member', body=elastic_query)
    members = extract_documents(elastic_result)
    return [process_member(member) for member in members]
