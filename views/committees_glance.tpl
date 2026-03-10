% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (int(n),"tsnrhtdd"[(int(n)//10%10!=1)*(int(n)%10<4)*int(n)%10::4])
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
	<span style="margin-left: 15px;">
						<select id="congress-selector" class="form-control input-sm" style="width: 260px; display: inline-block;">
						% for cong in range(max_congress, 0, -1):
						%   start_year = 1787 + 2*cong
						%   end_year = 1789 + 2*cong
							<option value="{{cong}}"{{' selected="selected"' if cong == max_congress else ''}}>{{rcSuffix(cong)}} Congress ({{start_year}}-{{end_year}})</option>
						% end
						</select>
					</span>
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
