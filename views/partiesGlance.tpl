% STATIC_URL = "/static/"
% rebase('base.tpl', title='Parties at a Glance', extra_css=['map.css'])
% include('header.tpl')
<div class="container">
	
	<div id="loading-container">
		<h3>Now loading. . .&nbsp;&nbsp;
			<img src="{{ STATIC_URL }}img/loading.gif" />
		</h3>
	</div>
	
	<div id="content">
		<div class="row">
			<div class="col-md-12" style="padding-bottom:20px;">
				<h3>
					<abbr title="Parties"><a href="/parties/all">Parties</a></abbr> &gt; 
					Parties Overview
				</h3>

				<h4>Congress at a Glance:</h4>
				<div class="alert alert-info fade in" style="margin-bottom:20px;">
					<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a> 
					<strong>How to Read Chart:</strong> 
					This chart shows the ideologies of <em>major parties</em> in congress throughout history according to <strong>DW-Nominate</strong>. 
					Each line represents the median (mid-point) ideology of members of a single party. A lower line means a more liberal party, while a higher line means a more conservative party.
					The grey line shows the median across all parties in congress at a given point. As control of congress changes hands after elections, large swings in the median ideology are visible. The pale dots in the background show the range of ideologies within a party. Move your mouse over party lines for more details, click a line to explore a single party.
				</div>

				<div id="dim-chart"></div>


			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<h4>Parties Throughout History</h4>
				<div id="partySet"></div>
			</div>
		</div>
	</div>
</div>

<script language="javascript">
	var mapParties=1;
	var congressNum={{maxCongress}};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/partyGlance.js"></script>

