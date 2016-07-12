% STATIC_URL = "/static/"
% rebase('base.tpl', title='Parties', extra_css=['map.css'])
% include('header.tpl')

<div class="container">
	
	<div id="loading-container">
		<h3>{{ party}} Loading dataset</h3>
		<img src="{{ STATIC_URL }}img/loading.gif" />
	</div>
	
	<div id="content">
		<div class="row">
			<div class="col-md-12">
				<h4>Party {{ party }} members over time <small><a class="reset" href="javascript:timeChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				<div id="time-chart"></div>
			</div>
		</div>
		<div class="row">
			<div class="col-md-12">
				<h4>Party {{ party }} mean ideal point over time<small><a class="reset" href="javascript:dimChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				<div id="dim-chart"></div>
			</div>
		</div>
	</div>
</div>

<script language="javascript">var party_param = "{{ party }}";</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/party.js"></script>
