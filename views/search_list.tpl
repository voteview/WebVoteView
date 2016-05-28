% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])

% for rollcall in rollcalls:
	<div class="panel panel-default">
		<div class="panel-heading">
			<strong>
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt; 
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber"><a href="/rollcall/{{ rollcall["id"] }}">Vote {{ rollcall["rollnumber"] }}</a></abbr>
			</strong>
			on {{ rollcall["date"] }}
			<span class="pull-right">
				<input type="checkbox" name="ids" value="{{ rollcall["id"] }}"> 
				<img src="/static/img/export.png" style="cursor:pointer;width:24px;vertical-align:middle;" data-toggle="tooltip" data-placement="bottom" title="Export Vote" onclick="javascript:$('input[value={{ rollcall["id"] }}]').attr('checked',true);">
			</span>
		</div>
		<div class="panel-body" style="cursor:pointer;" onclick="javascript:window.location='/rollcall/{{ rollcall["id"] }}';">
			% if len(rollcall["code"]["Clausen"])>0:
			<p><small><strong>Vote Categories</strong>: {{ rollcall["code"]["Clausen"][0] }}, {{ rollcall["code"]["Peltzman"][0] }}</small></p>
			% end
			<p>{{ " ".join(rollcall["description"].split()[0:50]) }}</p>

			<a href="/rollcall/{{ rollcall["id"] }}" style="float:right;"><img src="/static/img/graph.png" style="width:32px;" data-toggle="tooltip" data-placement="bottom" title="View Vote"></a>
		</div>
	</div>
% end

% if not len(rollcalls) and not errormessage:
	<h2>No rollcalls with those parameters found</h2>
% elif errormessage:
	<h2>Error completing search!</h2>
	{{ errormessage }}
% end
