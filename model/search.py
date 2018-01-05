from datetime import datetime
import urlparse

import inflection


import model.elastic
from model.utils import merge_dicts, rename_key


def concat_values(mapping, new_key, keys, join_str='; '):
    """Join dict values into a string with a new key."""
    result = mapping.copy()
    values = [mapping.get(key) for key in keys if mapping.get(key)]
    result[new_key] = join_str.join(values)
    return result


def add_members_party_data(members):
    member_party_codes = set(member['party_code'] for member in members)
    party_code_to_party_dict = {code: model.partyData.getPartyData(
        code) for code in member_party_codes}
    members = [
        merge_dicts(member, party_code_to_party_dict[member['party_code']])
        for member in members
    ]
    members = [rename_key(member, 'partyname', 'party_name')
               for member in members]
    return members


def search_rollcalls(elastic_client, user_query):

    rollcalls = model.elastic.get_rollcalls(elastic_client, user_query)
    text_fields = [
        'vote_desc', 'vote_document_text', 'description', 'short_description',
        'dtl_desc',
    ]
    rollcalls = [concat_values(r, 'text', text_fields, ' | ')
                 for r in rollcalls]
    return rollcalls


def search_members(elastic_client, user_query):
    if user_query.get('page', 1) == 1:
        return []
    members = model.elastic.get_members(elastic_client, user_query)
    members = add_members_party_data(members)
    members = model.utils.deduplicate(members, key=lambda x: x['icpsr'])
    return list(members)


def simplify_user_query(user_query):
    list_keys = ['chamber', 'clausen']
    new = {k: v if k in list_keys else v[0] for k, v in user_query.items()}
    new = {k: [] if v == [''] else v for k, v in new.items()}
    try:
        new['from_support'], new['to_support'] = new.pop('support').split(',')
    except KeyError:
        pass
    return new


def parse_date_string(date_string):
    output_format = '%Y-%m-%d'
    if len(date_string) == 4:
        date = datetime.strptime(date_string, '%Y')
    else:
        return date_string
    return date.strftime(output_format)


def parse_query_string(query_string):
    query_dict = urlparse.parse_qs(query_string, keep_blank_values=True)
    query_dict = {
        inflection.underscore(k): v
        for k, v in query_dict.items()
    }
    query_dict = simplify_user_query(query_dict)
    query_dict['from_date'] = parse_date_string(query_dict['from_date'])
    query_dict['to_date'] = parse_date_string(query_dict['to_date'])
    return query_dict
