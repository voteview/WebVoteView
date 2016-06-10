% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% if len(resultMembers):
	<div class="row">
% for member in resultMembers:
		<div class="col-md-3" id="memberResultBox" onClick="javascript:window.location='/person/{{member["icpsr"]}}';">
			<img src="/static/img/bios/{{member["bioImg"]}}" style="width:80px;height:80px;padding-right:20px;vertical-align:middle;" class="pull-left">
			<div style="font-size:0.9em;vertical-align:middle;padding-top:15px;">
				% if "bioName" in member and member["bioName"] is not None:
					<strong>{{member["bioName"]}}</strong><br/>
				% elif "fname" in member and member["fname"] is not None:
					<strong>{{member["fname"]}}</strong><br/>
				% else:
					<strong>{{member["name"]}}</strong><br/>
				% end
				{{member["stateName"]}}<br/>
				{{member["partyname"]}} (Elected {{member["yearsOfService"][0][0]}})
			</div>
		</div>
% end
	</div><br/>
% end
% for rollcall in rollcalls:
	<div class="panel panel-default">
		<div class="panel-heading">
			<strong>
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

			% if len(rollcall["code"]["Clausen"])>0:
			<p><small><strong>Vote Categories</strong>: {{ rollcall["code"]["Clausen"][0] }}, {{ rollcall["code"]["Peltzman"][0] }}</small></p>
			% end
			%
			<p>{{ " ".join(rollcall["description"].split()[0:50]) }}</p>
		</div>
	</div>
% end

% if not len(rollcalls) and not errormessage:
	<h4>No votes found matching your search</h4>
% elif errormessage:
	<h2>Error completing search!</h2>
	{{ errormessage }}
% end
