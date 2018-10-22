% orgMapping = {"CQ": "Congressional Quarterly", "GOV": "Congress.gov", "VV": "Voteview Staff", "wikipedia": "Wikipedia"}

	<div class="row">
		<div class="col-md-12">
			<h3>
				% if "key_flags" in rollcall and len(rollcall["key_flags"]) and rollcall["key_flags"][0] in orgMapping:
				<span class="btn btn-default btn-lg" id="key_vote_icon" 
					data-toggle="tooltip" data-placement="bottom" 
					title="Vote classified as a 'Key Vote' by {{orgMapping[rollcall["key_flags"][0]]}}.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt;
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber">Vote {{ rollcall["rollnumber"] }}  </abbr>

			</h3>

			<p class="meta_float"><strong>Date:</strong> {{ rollcall["date"] }}</p>

			% if "yea_count" in rollcall and "nay_count" in rollcall:
			<p class="meta_float">
				<strong>Result:</strong>
				{{ rollcall["yea_count"] }}-{{ rollcall["nay_count"] }}
				% if rollcall['vote_result']:
				 ({{ rollcall['vote_result']}})
				% end
				% if "tie_breaker" in rollcall and "by_whom" in rollcall["tie_breaker"]:
				<p class="clearfix">
					<strong>Tie-breaker:</strong> 
					{{"The " if rollcall["tie_breaker"]["by_whom"] == "Vice President" else ""}}{{rollcall["tie_breaker"]["by_whom"]}} 
					cast the tie-breaking vote of <i>{{rollcall['tie_breaker']['tie_breaker_vote']}}</i>.
				</p>
				% end
			</p>
			% end

			% if "clerk_rollnumber" in rollcall:
			<p> <strong>Clerk session vote number:</strong> {{rollcall['clerk_rollnumber']}} </p>
			% end

			% if "codes" in rollcall and ("Peltzman" in rollcall["codes"] or "Clausen" in rollcall["codes"]):
			<p class="meta_float">
				<strong>Vote Subject Matter:</strong>
				% if "Clausen" in rollcall["codes"]:
				{{ rollcall["codes"]["Clausen"][0] }}
				% if "Peltzman" in rollcall["codes"]:
				/ {{ rollcall["codes"]["Peltzman"][0] }}
				% end
				% end
			</p>
			% end

			% if "name" in sponsor:
			<p><strong>Sponsor:</strong> <a href="/person/{{sponsor["icpsr"]}}/{{sponsor["seo_name"]}}">{{sponsor["name"]}} ({{sponsor["party"][0]}}-{{sponsor["state_abbrev"]}})</a></p>
			% end

                        % if rollcall.get("bill_number"):
                        <p class="meta_float"><strong>Bill number: </strong>{{ rollcall["bill_number"] }}</p>
			% end

			% if "question" in rollcall and rollcall["question"]:
			<p class="meta_float"><strong>Question: </strong>{{ rollcall["question"] }}</p>
			% end

			<p class="clearfix"></p>

			<p><strong>Description: </strong>{{ rollcall["description"] }}</p>

			% if "cg_summary" in rollcall:
			% if len(rollcall["cg_summary"]) > 500:
				% preview_chunk = rollcall["cg_summary"][:500].rsplit(" ", 1)[0]
				% extended_chunk = rollcall["cg_summary"][len(preview_chunk):]
				<p class="clearfix">
					<strong>Bill summary: </strong>{{preview_chunk}}
					<a href="#" id="descriptionExtender" onClick="javascript:$('#extendedDescription').show();$(this).hide();return false;">(...show more)</a>
					<span id="extendedDescription">
						{{ extended_chunk }}<br/><br/>
						<a href="#" onClick="javascript:$('#extendedDescription').hide();$('#descriptionExtender').show();return false;">Click to hide full description.</a>
					</span>
				</p>
			% else:
				<p class="clearfix"><strong>Bill summary:</strong> {{ rollcall["cg_summary"] }}</p>
			% end
			% end

   % if title_text:
  <p> <strong>Bill titles:</strong> {{title_text}}</p>
   % end

	 % if sources:
	 <p>
	<strong>Original source documents: </strong>

	% publication_strings = []
	% for source in sources:
	%     if source['is_linkable']:
	%         pub =  source['publication']
	%					pub_str = pub
	%     link_dict = {k:v for k,v in source.items() if k in ['publication', 'file_number', 'page_number']}

	 % link = '/source_images/' + source['publication'].replace(' ', '_').lower() + '/' + str(source['file_number']) + '/0#page/' +  str(source['page_number'])
	 <a href="{{ link }}">{{pub_str}} vol. {{source['file_number']}}, p. {{source['page_number']}}</a>;
	%     else:
	 %	        pub_str = source['publication']
	{{pub_str}} vol. {{source['file_number']}}, p. {{source['page_number']}};
  %     end
	% end

	 </p>
	 % end
  <p>
    % if 'congress_url' in rollcall:
        Links for more info on the vote:
	     <a href={{rollcall['congress_url']}}> congress.gov</a>
	   </p>
	 % end

 % import datetime
 % current_date = datetime.datetime.today().date()
 % rollcall_date = datetime.datetime.strptime(rollcall['date'], '%Y-%m-%d').date()
 % if (current_date - rollcall_date).days < 7:
   <p><strong>Note: This is a recent vote, subject to change by official sources.</strong></p>
 % end

		</div>
	</div>

