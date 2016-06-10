% STATIC_URL = "/static/"
% rebase('base.tpl', title='Explore', extra_css=['map.css'])
% include('header.tpl')

<div class="container">
	<div id="loading-container">
		<h3>Loading dataset</h3>
		<img src="{{ STATIC_URL }}img/loading.gif" />
	</div>

	<div id="content">
		<div class="row">
			<div class="col-md-12">
				<h4>Votes over time <small><a class="reset" href="javascript:timeChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				<div id="time-chart"></div>
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
				<div id="clausen-chart">
					<h4>Subject Matter  <small><a class="reset" href="javascript:clausenChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				</div>
				<div id="result-chart">
					<h4>Result <small><a class="reset" href="javascript:resultChart.filterAll();dc.redrawAll();" style="display: none;">reset</a></small></h4>
				</div>
			</div>
		</div>

		<div class="row">
			<div class="col-md-12">
                	<!-- <h4>Rollcalls list</h4> -->
			<div id="data-count">
				<span class="filter-count"></span> selected out of <span class="total-count"></span> records | <a href="javascript:dc.filterAll(); dc.renderAll();">Reset All</a>
			</div>

			<!--
			<table class="table table-hover dc-data-table">
				<thead>
					<tr class="header">
						<th>Date</th>
						<th>Result</th>
						<th>Description</th>
						<th>Link</th>
					</tr>
				</thead>
			</table>
			-->
		</div>
	</div>
</div>

<script language="javascript">var chamber_param = "{{ chamber }}";</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/explore.js"></script>

