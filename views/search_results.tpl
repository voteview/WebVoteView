% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% import re
% from stemming.porter2 import stem
% from titlecase import titlecase
% include('member_party_list.tpl', resultMembers=resultMembers, resultParties=resultParties)



% orgMapping = {"CQ": "Congressional Quarterly", "GOV": "Congress.gov", "VV": "Voteview Staff", "wikipedia": "Wikipedia"}

% def doHighlight(highlighter, text):
%     	stopwords = [x.strip() for x in open("model/stop_words.txt","r").read().split("\n")]
%	if not len(highlighter):
%		return text
%	end
%	words = highlighter.split()
%	stemSet = []
%	reSet = r"("+highlighter+")"
%	for word in words:
% 		if len(word)>2:
%			reSet += "|("+word+")"
%			if stem(word)!=word:
%				stemSet.append(stem(word))
%			end
%		end
%	end
%	for stemS in stemSet:
%		if len(stemS)>2:
%			reSet += "|("+stemS+")"
%		end
%	end
%	spans = [m for m in re.finditer(reSet, text, re.I)]
%	newS = ""
%	last = 0
%	for s in spans:
%		if s.lastindex==1:
%			ternary = ""
%		elif s.lastindex<=1+len(stemSet):
%			ternary = "2"
%		else:
%			ternary = "3"
%		end
%		if not text[s.start():s.end()].lower() in stopwords:
%			newS += text[last:s.start()] + '<span class="searchHighlight'+(ternary)+'">'+text[s.start():s.end()]+'</span>'
%		else:
%			newS += text[last:s.start()] + ' '+text[s.start():s.end()]
%		end
%		last = s.end()
%	end
%	newS += text[last:]
%	return newS
% end

<div class="col-md-4" id="filters">
	% for facet in facets:
		<div class="panel panel-default facet-{{ facet['name'] }}">
			<div class="panel-heading">{{ facet['name'] }}</div>
			<div class="panel-body">
			% for value in facet['values']:
				<p class="facet-value"><a class="btn {% if value.selected %}btn-primary{% else %}btn-default{% endif %}" href="{{ value['href'] }}">{{ int(value['value']) if isinstance(value['value'],float) else value['value']  }} <span class="badge">{{ value['count'] }}</span></a></p>
			% end
			</div>
		</div>
	% end
</div>


% for rollcall in rollcalls:
	<div class="panel panel-default rollcall">
		<div class="panel-heading">
			<strong>
				% if ("key_flags" in rollcall and rollcall["key_flags"] and rollcall["key_flags"][0] in orgMapping):
				<span class="btn btn-default btn-sm" style="margin-right:10px;"
					data-toggle="tooltip" data-placement="bottom"
					title="Vote classified as a 'Key Vote' by {{orgMapping[rollcall["key_flags"][0]]}}">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt;
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber"><a href="/rollcall/{{ rollcall["id"] }}">Vote {{ rollcall["rollnumber"] }}</a></abbr>
			</strong>
			on <abbr title="Date"><a href="/search/?fromDate={{rollcall["date"]}}&toDate={{rollcall["date"]}}">{{ rollcall["date"] }}</a></abbr>
			<span style="float:right;">
				<a href="/rollcall/{{ rollcall["id"] }}"><img src="/static/img/graph.png" style="width:24px;margin-right:16px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>

				<input type="checkbox" name="ids" value="{{ rollcall["id"] }}">
				<img src="/static/img/export.png" style="cursor:pointer;width:24px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="Export Vote" onclick="javascript:checkBox('{{rollcall["id"]}}');">
			</span>
		</div>
		<a href="/rollcall/{{rollcall["id"]}}" class="nohover">
		<div class="panel-body" style="cursor:pointer;">
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

			% if rollcall.get('question'):
			<p><strong>Question</strong>: {{ rollcall["question"] }}</p>
			% end
			<p><strong>Description</strong>: {{!doHighlight(highlighter, " ".join(titlecase(rollcall["text"].lower()).split()[0:50])) }}</p>



			% debug = False
			% if "score" in rollcall and debug:
				<p style="font-size:8px;"><em>Debug: {{round(rollcall["score"],2)}}</em></p>
			% end
		</div>
		</a>
	</div>
% end

% if not len(rollcalls) and not errormessage:
	<h4 id=no-more-rollcalls-message>No more votes found matching your search</h4>
% elif errormessage:
	<h2>Error completing search!</h2>
	{{ errormessage }}
% end
