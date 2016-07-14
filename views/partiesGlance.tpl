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
				<h4>Parties Throughout History</h4>
				<div id="partySet"></div>
			</div>
		</div>
	</div>
</div>

<script language="javascript">var mapParties=1;</script>
<script language="javascript">var congressNum=114;</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/partyGlance.js"></script>

