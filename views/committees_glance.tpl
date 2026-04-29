% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (int(n),"tsnrhtdd"[(int(n)//10%10!=1)*(int(n)%10<4)*int(n)%10::4])
% rebase('base.tpl', title='Committees at a Glance', extra_css=['map.css'], extra_js=["/static/js/libs/jquery.tablesorter.min.js"])
% include('header.tpl')
<div class="row">
	<div class="col-md-12">
		<div class="alert alert-info" role="alert">
			We are pleased to now track House and Senate committees and their members over time. We rely on the great work of David Cannon, Garison Nelson, Charles Stewart, and Jonathan Woon to provide this information for the 1st through the 105th congresses. We welcome your feedback, suggestions, and corrections.
		</div>
	</div>
</div>
<div class="container">

	<div id="loading-container">
		<h3>Now loading. . .&nbsp;&nbsp;
			<img src="{{ STATIC_URL }}img/loading.gif" alt="" role="presentation" />
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
						<label for="congress-selector" class="visually-hidden">Select Congress</label>
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

<div id="committee-credit-content" style="display:none">
	<p>Committee assignments for the 1st to 105th Congresses are based on the following data collections:</p>
	<p>David Canon, Garrison Nelson, and Charles Stewart. <em>Historical Congressional Standing Committees, 1st to 79th Congresses, 1789&ndash;1947.</em></p>
	<p>Garrison Nelson. <em>Committees in the U.S. Congress, 1947&ndash;1992.</em></p>
	<p>Charles Stewart III and Jonathan Woon. <em>Congressional Committee Assignments, 103rd to 105th Congresses, 1993&ndash;1998.</em></p>
	<p>These datasets are available for download from Charles Stewart's Congressional Data <a href="https://web.mit.edu/cstewart/www/data/data_page.html" target="_blank">webpage</a>.</p>
</div>
<p style="text-align:right; margin-top:8px; padding-right:15px;">
	<small><button type="button" class="link-button" id="committee-credit-link">Data Credits</button></small>
</p>

<script language="javascript">
	$(document).ready(function() {
		$('#committee-credit-link').popover({
			html: true,
			trigger: 'manual',
			placement: 'top',
			container: 'body',
			content: function() { return $('#committee-credit-content').html(); }
		}).on('mouseenter', function() {
			var _this = this;
			$(this).popover('show');
			$('.popover').on('mouseleave', function() {
				$(_this).popover('hide');
			});
		}).on('mouseleave', function() {
			var _this = this;
			setTimeout(function() {
				if (!$('.popover:hover').length) {
					$(_this).popover('hide');
				}
			}, 100);
		});
	});

	var congressNum = {{max_congress}};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/committeeGlance.js"></script>
