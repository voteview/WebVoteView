% STATIC_URL = "/static/"
% rebase('base.tpl', title='Parties at a Glance', extra_css=['map.css'], extra_js=["/static/js/libs/jquery.tablesorter.min.js"])
% include('header.tpl')
<div class="container">

	<div id="loading-container">
		<h3>Now loading. . .&nbsp;&nbsp;
			<img src="{{ STATIC_URL }}img/loading.gif" />
		</h3>
	</div>

	<div id="content">
		<div class="row pad_bottom">
			<div class="col-md-12">
				<h3>
					<abbr title="Parties"><a href="/parties/all">Parties</a></abbr> &gt;
					Parties Overview
				</h3>

				<h4>Congress at a Glance: Major Party Ideology</h4>

				<div id="dim-chart"></div>

			</div>
		</div>

		<div class="row pad_bottom">
			<div class="col-md-12" id="parties_list">
				<h4>Parties Throughout History</h4>
			</div>
		</div>
	</div>
</div>

<script language="javascript">
	var mapParties = 1;
	var congressNum = {{max_congress}};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/partyGlance.js"></script>
