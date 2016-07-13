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
				<h4>Congress at a glance:</h4>
				<div id="dim-chart"></div>
			</div>
		</div>
	</div>
</div>

<script language="javascript">var mapParties=1;</script>
<script language="javascript">var congressNum=114;</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/partyGlance.js"></script>

