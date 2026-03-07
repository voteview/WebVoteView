% STATIC_URL = "/static/"
% rebase('base.tpl', title='Committees at a Glance', extra_css=['map.css'], extra_js=["/static/js/libs/jquery.tablesorter.min.js"])
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
					<abbr title="Committees"><a href="/committees/all">Committees</a></abbr> &gt;
					Committees Overview
				</h3>

				<div id="committee-filters" style="margin-bottom: 15px;">
					<div class="btn-group" id="chamber-filter" style="margin-right: 15px;">
						<button type="button" class="btn btn-sm btn-primary active" data-chamber="all">All</button>
						<button type="button" class="btn btn-sm btn-default" data-chamber="House">House</button>
						<button type="button" class="btn btn-sm btn-default" data-chamber="Senate">Senate</button>
						<button type="button" class="btn btn-sm btn-default" data-chamber="Joint">Joint</button>
					</div>
					<div style="display: inline-block;">
						<input type="text" id="committee-search" class="form-control input-sm"
							placeholder="Search committees..." style="width: 250px; display: inline-block;">
					</div>
					<label style="margin-left: 15px; font-weight: normal;">
						<input type="checkbox" id="show-active-only" checked> Active committees only
					</label>
				</div>

			</div>
		</div>

		<div class="row pad_bottom">
			<div class="col-md-12" id="committees_list">
			</div>
		</div>
	</div>
</div>

<script language="javascript">
	var congressNum = {{max_congress}};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/committeeGlance.js"></script>
