% STATIC_URL = "/static/"
% rebase('base.tpl', title=plotTitle, extra_css=["map.css","scatter.css", "bootstrap-slider.css"], extra_js=["/static/js/libs/saveSvgAsPng.js", "/static/js/libs/bootstrap-slider.min.js","/static/js/libs/sticky-kit.min.js", "/static/js/stateMeta.js"])
% include('header.tpl')

% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% orgMapping = {"CQ": "Congressional Quarterly", "GOV": "Congress.gov", "VV": "Voteview Staff", "wikipedia": "Wikipedia"}

<div id="holdHatching">
</div>

<div class="container">
	<div class="row">
		<div class="col-md-12">
			<h3>
				% if "key_flags" in rollcall and len(rollcall["key_flags"]) and rollcall["key_flags"][0] in orgMapping:
				<span class="btn btn-default btn-lg"
					style="margin-right:10px;" data-toggle="tooltip" data-placement="bottom"
					title="Vote classified as a 'Key Vote' by {{orgMapping[rollcall["key_flags"][0]]}}.">
					<span class="glyphicon glyphicon-star" aria-hidden="true"></span> Key Vote
				</span>
				% end
				<abbr title="Congress"><a href="/search/?congress={{ rollcall["congress"] }}">{{ rcSuffix(rollcall["congress"]) }} Congress</a></abbr> &gt;
				<abbr title="Chamber"><a href="/search/?congress={{ rollcall["congress"] }}&chamber={{ rollcall["chamber"] }}">{{ rollcall["chamber"] }}</a></abbr> &gt;
				<abbr title="Rollnumber">Vote {{ rollcall["rollnumber"] }}  </abbr>

			</h3>

			<p style="float:left;margin-right:20px;"><strong>Date:</strong> {{ rollcall["date"] }}</p>
			% if 'clerk_rollnumber' in rollcall:
			<p> <strong>Clerk session vote number:</strong> {{rollcall['clerk_rollnumber']}} </p>
			% end
			% if "yea_count" in rollcall and "nay_count" in rollcall:
			<p style="float:left;margin-right:20px;">
				<strong>Result:</strong>
				{{ rollcall["yea_count"] }}-{{ rollcall["nay_count"] }}
				% if rollcall['vote_result']:
				 ({{ rollcall['vote_result']}})
				% end
				% if "tie_breaker" in rollcall and "by_whom" in rollcall["tie_breaker"]:
				% tie_breaking_voter = 'The ' + rollcall['tie_breaker']['by_whom'] if rollcall['tie_breaker']['by_whom'] == 'Vice President' else rollcall['tie_breaker']['by_whom']
				<p style="clear:both;"><strong>Tie-breaker:</strong> {{tie_breaking_voter}} cast the tie-breaking vote of <i>{{rollcall['tie_breaker']['tie_breaker_vote']}}</i>.</p>
				% end
			</p>
			% end
			% if "codes" in rollcall and ("Peltzman" in rollcall["codes"] or "Clausen" in rollcall["codes"]):
			<p style="float:left;margin-right:20px;"><strong>Vote Subject Matter:</strong>
			% if "Clausen" in rollcall["codes"]:
			{{ rollcall["codes"]["Clausen"][0] }}
			% if "Peltzman" in rollcall["codes"]:
			/ {{ rollcall["codes"]["Peltzman"][0] }}
			% end
			% end
			</p>
			% end
			% if "name" in sponsor:
			<p><strong>Sponsor:</strong> <a href="/person/{{sponsor["icpsr"]}}/{{sponsor["seo_name"]}}">{{sponsor["name"]}} ({{sponsor["party"][0]}}-{{sponsor["state_abbrev"]}})</a></p>
			% end
                        % if rollcall.get("bill_number"):
                        <p style="clear:both;"><strong>Bill number: </strong>{{ rollcall["bill_number"] }}</p>
			% end
			% if "question" in rollcall and rollcall["question"]:
			<p style="clear:both;"><strong>Question: </strong>{{ rollcall["question"] }}</p>
			% end
			<p style="clear:both;"><strong>Description: </strong>{{ rollcall["description"] }}</p>
			% if "cg_summary" in rollcall:
			% if len(rollcall["cg_summary"]) > 500:
				% preview_chunk = rollcall["cg_summary"][:500].rsplit(" ", 1)[0]
				% extended_chunk = rollcall["cg_summary"][len(preview_chunk):]
				<p style="clear:both;">
					<strong>Bill summary: </strong>{{preview_chunk}}
					<a href="#" id="descriptionExtender" onClick="javascript:$('#extendedDescription').show();$(this).hide();return false;">(...show more)</a>
					<span id="extendedDescription" style="display:none;">
						{{ extended_chunk }}<br/><br/>
						<a href="#" onClick="javascript:$('#extendedDescription').hide();$('#descriptionExtender').show();return false;">Click to hide full description.</a>
					</span>
				</p>
			% else:
				<p style="clear:both;"><strong>Bill summary:</strong> {{ rollcall["cg_summary"] }}</p>
			% end
			% end

   % official_titles = rollcall.get('cg_official_titles', [])
   % short_titles = rollcall.get('cg_short_titles_for_portions', [])
   % titles = official_titles + short_titles
   % if titles:
  <p> <strong>Bill titles:</strong>
    {{'; '.join(title.encode('utf-8') for title in titles)}}
  </p>
   % end

	 % if sources:
	 <p>
	<strong>Original source documents: </strong>

	% publication_strings = []
	% for source in sources:
	%     if source['is_linkable']:
	%         pub =  source['publication']
	%					pub_str = pub
	%     link_dict = {k:v for k,v in source.items() if k in ['publication', 'file_number', 'page_number']}

	 % link = '/source_images/' + source['publication'].replace(' ', '_').lower() + '/' + str(source['file_number']) + '/0#page/' +  str(source['page_number'])
	 <a href="{{ link }}">{{pub_str}} vol. {{source['file_number']}}, p. {{source['page_number']}}</a>;
	%     else:
	 %	        pub_str = source['publication']
	{{pub_str}} vol. {{source['file_number']}}, p. {{source['page_number']}};
  %     end
	% end

	 </p>
	 % end
  <p>
    % if 'congress_url' in rollcall:
        Links for more info on the vote:
	     <a href={{rollcall['congress_url']}}> congress.gov</a>
	   </p>
	 % end

 % import datetime
 % current_date = datetime.datetime.today().date()
 % rollcall_date = datetime.datetime.strptime(rollcall['date'], '%Y-%m-%d').date()
 % if (current_date - rollcall_date).days < 7:
   <p><strong>Note: This is a recent vote, subject to change by official sources.</strong></p>
 % end

		</div>
	</div>

	<div class="row" id="loadBar">
		<div class="col-md-12">
			<h4>
				Loading graphics...
				<img src="/static/img/loading.gif" class="loading_throbber">
			</h4>
		</div>
	</div>

	<div class="row" id="errorContent">
		<div class="col-md-12">
			<h4>Error!</h4>
			<div class="errorMessage"></div>
		</div>
	</div>

	<div class="row loadedContent">
		<div class="col-md-9" style="min-width: 800px; margin-right:35px;"> <!-- this is the left column containing the map and the NOMINATE graph -->
			<div id="geoMap">
				<h4>
					Map

					<span class="glyphicon glyphicon-save noprint"
					      onclick="javascript:resetZoom();saveSvgAsPng($('#map-chart > svg')[0],'vote_map_{{rollcall["chamber"][0]}}{{rollcall["congress"]}}{{str(rollcall["rollnumber"]).zfill(4)}}.png', {backgroundColor: 'white'});return false;"
					      data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Map as PNG">
					</span>

					%if len(noteText):
						<img src="/static/img/help.png" class="noteText left-tooltip noprint" data-toggle="tooltip" data-position="bottom" data-html="true" title="{{ noteText }}">
					%end

				</h4>

				<span id="map-chart"> <!-- This span tells DC where to put the map -->
					<button id="zoomIn" class="glyphicon glyphicon-plus noprint" onClick="javascript:doZoom(1);return false;"></button>
					<button id="zoomOut" class="glyphicon glyphicon-minus noprint" onClick="javascript:doZoom(-1);return false;"></button>

					<input id="ex1" data-slider-id="panY" type="text" data-slider-min="0" data-slider-max="500" data-slider-step="1"
							data-slider-orientation="vertical" data-slider-tooltip="hide" data-slider-handle="custom">
					<input id="ex2" data-slider-id="panX" type="text" data-slider-min="0" data-slider-max="890"
							data-slider-step="1" data-slider-tooltip="hide" data-slider-handle="custom">
					<span id="suppressMapControls"><span class="filter"></span></span>
				</span>

				<div class="alert alert-info noprint" role="alert" id="warnParty"><!-- This div warns about party combining -->
					<strong>Note:</strong> This map combines minor parties to increase visual clarity.
					<a href="/rollcall/{{rollcall["id"]}}?mapParties=0">Click here to view all parties separately.</a>
				</div>
			</div> <!-- Outside the Geo map, still inside the first column of the first row -->

			<!-- Nominate graph -->
			<h4>DW-Nominate Cutting Line
				<span class="glyphicon glyphicon-save noprint nominateSave"
					onclick="javascript:saveSvgAsPng($('#scatter-chart > svg')[0],'dw_nominate_{{rollcall["chamber"][0]}}{{rollcall["congress"]}}{{str(rollcall["rollnumber"]).zfill(4)}}.png', {backgroundColor: 'white'});return false;"
					data-toggle="tooltip" data-position="bottom" data-html="true" title="Save Plot as PNG">
				</span>
			</h4>

			<div id="scatter-container">
				<div id="scatter-bg">
					<svg id="svg-bg"></svg>
				</div>
				<div id="scatter-chart">
					<span id="suppressNominateControls"><span class="filter"></span></span>
				</div>
			</div>
		</div> <!-- Outside the first column onto the second column (the vote table). -->


		<div class="col-md-2 noprint" id="vote_chart_float">
			<h4>Votes
				<a href="/api/download?rollcall_id={{rollcall["id"]}}">
					<span class="glyphicon glyphicon-save saveButton"
						data-toggle="tooltip" data-position="bottom" data-html="true" title="Download vote data as JSON.">
					</span>
				</a>
				<a href="/api/downloadXLS?ids={{rollcall["id"]}}">
					<img src="/static/img/xls.png" class="xlsButton"
						data-toggle="tooltip" data-position="bottom" data-html="true" title="Download vote data as XLS.">
				</a>
			</h4>
			<div id="party-chart">
				<span id="suppressVoteChartControls"><span class="filter"></span></span>
			</div>
		</div>
	</div>

	<div class="row voteRow loadedContent">
		<div class="col-md-12" id="voteBucket">
			<div>
				<div class="voteHeader">Votes</div>
				<div class="noprint sortHeader">
					(Sort by
					<a href="#" onclick="javascript:outVotes('party');return false;">Party</a>,
					<a href="#" onclick="javascript:outVotes('state');return false;">State</a>,
					<a href="#" onclick="javascript:outVotes('vote');return false;">Vote</a>,
					<a href="#" onclick="javascript:outVotes('x');return false;">Ideology</a>,
					<a href="#" onclick="javascript:outVotes('prob');return false;">Vote Probability</a>)
				</div>
			</div>
			<div id="voteList"></div>
		</div>
	</div>
</div>

<!-- The hidden filter bar code -->
<div id="selectionFilterBar">
	<strong>Selected:</strong>
	<span id="data-count"><span class="filter-count"></span> of <span class="total-count"></span> <span id="votertype"></span></span>
	<span id="map-chart-controls"> from <span class="filter"></span></span>
	<span id="vote-chart-controls"> including <span class="filter"></span></span>
	<span id="nominate-chart-controls"> with NOMINATE scores within <span class="filter"></span></span>.
	<span id="sparse-selection"></span>
	<a class="reset" href="javascript:doFullFilterReset();">Remove Filter</a>
</div>
<img id="selectionFilterClose" onClick="javacript:doFullFilterReset();" src="/static/img/close.png">

<script type="text/javascript">
// Pass these variables from server-side script to the JS that expects they are set.
var chamber = "{{ rollcall["chamber"] }}";
var congressNum = "{{ str(rollcall["congress"]).zfill(3) }}";
var rcID = "{{ rollcall["id"] }}";
var mapParties = {{ mapParties }};
var nomDWeight = {{ dimweight }};
var nomBeta = {{ nomBeta }};
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/sprintf.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/topojson.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/mapPanZoom.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/decorate.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/voteCharts.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/voteTable.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/voteFilterbar.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/nominateHeatMap.js"></script>
