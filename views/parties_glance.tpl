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
			<div class="col-md-12">
				<h3>
					<abbr title="Parties"><a href="/parties/all">Parties</a></abbr> &gt; 
					Parties Overview
				</h3>

				<h4>Congress at a Glance:</h4>

				<div id="dim-chart"></div>


			</div>
		</div>
		<div class="row">
			<div class="col-md-12">
				<div class="alert alert-warning fade in" id="alertPartiesGlance">
					<a href="#" class="alert-link" id="closeAlert">&times;</a>
					<strong>How to Read Chart:</strong> 
					This chart shows the ideologies of <em>major parties</em> in Congress throughout history according to <strong>DW-NOMINATE</strong>. 
					Each line represents the median (mid-point) ideology of members of a single party. A lower line means a more liberal party, while a higher line means a more conservative party.
					The grey line shows the median across all parties in Congress at a given point. As control of Congress changes hands after elections, large swings in the median ideology are visible. The pale dots in the background show the range of ideologies within a party. Move your mouse over party lines for more details, click a line to explore a single party.
				</div>
			</div>
		</div>
		<div class="row">
			<div class="col-md-12" id="parties_list">
				<h4>Parties Throughout History</h4>
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

