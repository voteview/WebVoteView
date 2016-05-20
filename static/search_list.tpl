% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
	% for rollcall in rollcalls:
	<div class="panel panel-default">
		<div class="panel-heading">
			<strong>
				<abbr title="Congress">{{ rcSuffix(rollcall["congress"] }} Congress</abbr> &gt; 
				<abbr title="Chamber">{{ rollcall["chamber"] }}</abbr> &gt;
				<abbr title="Rollnumber">Vote {{ rollcall["rollnumber"] }}</abbr>
			</strong>
			on {{ rollcall["date"] }}
			<span class="pull-right"><input type="checkbox" name="rollcall" value="{{ rollcall["id"] }}"> Add to excel</span>
		</div>
		<div class="panel-body">
			<p><strong>Vote Category</strong>: {{ rollcall["code"]["Clausen"][0] }}, {{ rollcall["code"]["Peltzman"][0] }}</p>
			<p>{{ " ".join(rollcall["description"].split()[0:50]) }}</p>
			<a href="/rollcall/{{ rollcall["id"] }}" class="btn btn-primary pull-right">See vote</a>
		</div>
	</div>            
	% end

	% if not len(rollcalls):
		<h2>No rollcalls with those parameters found</h2>
	% end
