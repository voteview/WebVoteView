% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% import re
% from stemming.porter2 import stem
% include('member_party_list.tpl', resultMembers=resultMembers, resultParties=resultParties)

% orgMapping = {"cq": "Congressional Quarterly", "gov": "Congress.gov", "vv": "Voteview Staff"}

% def doHighlight(highlighter, text):
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
%		newS += text[last:s.start()] + '<span class="searchHighlight'+(ternary)+'">'+text[s.start():s.end()]+'</span>'
%		last = s.end()
%	end
%	newS += text[last:]
%	return newS
% end

% for rollcall in rollcalls:
	<div class="panel panel-default">
		<div class="panel-heading">
			<strong>
				% if ("keyvote" in rollcall and rollcall["keyvote"]):
				<span class="btn btn-default btn-sm" style="margin-right:10px;" 
					data-toggle="tooltip" data-placement="bottom" 
					title="Vote classified as a 'Key Vote' by {{orgMapping[rollcall["keyvote"][0]]}}">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt; 
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber"><a href="/rollcall/{{ rollcall["id"] }}">Vote {{ rollcall["rollnumber"] }}</a></abbr>
			</strong>
			on {{ rollcall["date"] }}
			<span style="float:right;">
				<a href="/rollcall/{{ rollcall["id"] }}"><img src="/static/img/graph.png" style="width:24px;margin-right:16px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>

				<input type="checkbox" name="ids" value="{{ rollcall["id"] }}"> 
				<img src="/static/img/export.png" style="cursor:pointer;width:24px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="Export Vote" onclick="javascript:checkBox('{{rollcall["id"]}}');">
			</span>
		</div>
		<div class="panel-body" style="cursor:pointer;" onclick="javascript:window.location='/rollcall/{{ rollcall["id"] }}';">
			% if "yea" in rollcall and "nay" in rollcall:
			<p>
				<small>
					<strong>Vote:</strong> {{ rollcall["yea"] }}-{{ rollcall["nay"] }}
				% if rollcall["yea"]>rollcall["nay"]:
					(Passed)
				% else:
					(Failed)
				% end
				</small>
			</p>
			% end

			% if "code" in rollcall and len(rollcall["code"]["Clausen"])>0:
			<p><small><strong>Vote Categories</strong>: {{ rollcall["code"]["Clausen"][0] }}, {{ rollcall["code"]["Peltzman"][0] }}</small></p>
			% end
			%
			<p>{{!doHighlight(highlighter, " ".join(rollcall["text"].split()[0:50])) }}</p>

			% if "score" in rollcall:
				<p style="font-size:8px;"><em>Debug: {{round(rollcall["score"],2)}}</em></p>
			% end

		</div>
	</div>
% end

% if not len(rollcalls) and not errormessage:
	<h4>No votes found matching your search</h4>
% elif errormessage:
	<h2>Error completing search!</h2>
	{{ errormessage }}
% end
