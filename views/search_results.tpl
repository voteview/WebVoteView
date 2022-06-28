% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% from model.search_results import do_highlight
% include('member_party_list.tpl', result_members=result_members, result_parties=result_parties)
% orgMapping = {"CQ": "Congressional Quarterly", "GOV": "Congress.gov", "VV": "Voteview Staff", "wikipedia": "Wikipedia"}
% for rollcall in rollcalls:
	<div class="panel panel-default">
		<div class="panel-heading">
			<strong>
				% if ("key_flags" in rollcall and rollcall["key_flags"] and rollcall["key_flags"][0] in orgMapping):
				<span class="btn btn-default btn-sm keyvote"
					data-toggle="tooltip" data-placement="bottom"
					title="Vote classified as a 'Key Vote' by {{orgMapping[rollcall["key_flags"][0]]}}">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt;
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber"><a href="/rollcall/{{ rollcall["id"] }}">Vote {{ rollcall["rollnumber"] }}</a></abbr>
			</strong>
			on <abbr title="Date"><a href="/search/?fromDate={{rollcall["date"]}}&toDate={{rollcall["date"]}}">{{ rollcall["date_user"] }}</a></abbr>
			<span class="pull-right">
				<a href="/rollcall/{{ rollcall["id"] }}"><img src="/static/img/graph.png" class="viewVote"
					data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>

				<input type="checkbox" name="ids" value="{{ rollcall["id"] }}">
				<img src="/static/img/export.png" class="exportVote"
					data-toggle="tooltip" data-placement="bottom" title="Export Vote" onclick="javascript:checkBox('{{rollcall["id"]}}');">
			</span>
		</div>
		<a href="/rollcall/{{rollcall["id"]}}" class="nohover">
		<div class="panel-body voteBody">
		  <!-- onclick="javascript:window.location='/rollcall/{{ rollcall["id"] }}';"> -->


			% if "bill_number" in rollcall:
			<p><strong>Bill number</strong>: {{rollcall["bill_number"]}}</p>
			% end


			% if "yea_count" in rollcall and "nay_count" in rollcall:
			<p>
					<strong>Vote:</strong> {{ rollcall["yea_count"] }}-{{ rollcall["nay_count"] }}
				% if 'vote_result' in rollcall:
				        ({{ rollcall['vote_result'] }})
				% end
			</p>
			% end

			% if "codes" in rollcall and ("Peltzman" in rollcall["codes"] or "Clausen" in rollcall["codes"]):
			<p><strong>Vote Categories</strong>:
			% if "Clausen" in rollcall["codes"]:
			{{ rollcall["codes"]["Clausen"][0] }}
			% if "Peltzman" in rollcall["codes"]:
			, {{ rollcall["codes"]["Peltzman"][0] }}
			% end
			% end
			</p>
			% end

			% if rollcall["question"]:
			<p><strong>Question</strong>: {{ rollcall["question"] }}</p>
			% end
			<p><strong>Description</strong>: {{!do_highlight(highlighter, rollcall["text"]) }}</p>

			% debug = False
			% if "score" in rollcall and debug:
				<p class="debugText"><em>Debug: {{round(rollcall["score"], 2)}}</em></p>
			% end
		</div>
		</a>
	</div>
% end

% if not len(rollcalls) and not errormessage:
	<h4>No votes found matching your search</h4>
% elif errormessage:
	<h2>Error completing search!</h2>
	{{ errormessage }}
% end
