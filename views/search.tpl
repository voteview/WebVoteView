% STATIC_URL = "/static/"
% rebase("base.tpl", title="Search", extra_js=["/static/js/libs/bootstrap-slider.min.js", "/static/js/palette.js"], extra_css=["bootstrap-slider.css", "search.css"])
% include('header.tpl')
% setdefault('args',{})
<div class="container">

	<div class="row">
		<div class="col-xs-12">
			<h3>Search Voteview.com</h3>
		</div>
	</div>

	<div id="results-page-container">
		<div class="row">
			<form id="faceted-search-form" action="." method="post" class="form-horizontal">

				<div id="search-bar-container" class="col-md-12">
					<div class="input-group">
						<input name="q" type="text" class="form-control" id="searchTextInput" placeholder="Enter a term to search for">
						<div class="input-group-btn">
							<button id="submit-search-string" class="btn btn-primary"><span class="glyphicon glyphicon-search"></span></button>
						</div>
						<span style="display:table-cell;width:125px;vertical-align:middle;padding-left:10px; font-size:0.9em;">
							<a href="#" onclick="javascript:toggleAdvancedSearch(0);return false;">advanced search</a>
						</span>
					</div>
				</div>

				<div id="results-selects" class="col-md-3" style="display:none;">
					<div id="panel-chamber" class="panel panel-primary">
						<div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-chamber">
							<h3 class="panel-title">Chamber <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
						</div>

						<div id="facet-chamber" class="panel-collapse facet-content collapse">
							<div class="panel-body">
								<div class="checkbox">
									<label>
										<input type="checkbox" name="chamber" id="optionsRadios1" value="Senate">
										Senate
									</label>
								</div>
								<div class="checkbox">
									<label>
										<input type="checkbox" name="chamber" id="optionsRadios2" value="House">
										House
									</label>
								</div>
							</div>
						</div>
					</div>

					<div class="panel panel-primary">
						<div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-date">
							<h3 class="panel-title">Date range <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
						</div>
						<div id="facet-date" class="panel-collapse facet-content collapse">
							<div class="panel-body">
								<div class="form-group">
									<label for="fromDate" class="col-sm-5 control-label">From</label>
									<div class="col-sm-6">
										<input name="fromDate" type="text" class="form-control" id="fromDate" placeholder="From">
									</div>
								</div>
								<div class="form-group">
									<label for="toDate" class="col-sm-5 control-label">To</label>
									<div class="col-sm-6">
										<input name="toDate" type="text" class="form-control" id="toDate" placeholder="To">
									</div>
								</div>
								<div align="center"><small><em>Format: YYYY-MM-DD or YYYY</em></small></div>
							</div>
						</div>
					</div>

					<div class="panel panel-primary">
						<div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-congress">
							<h3 class="panel-title">Congress range <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
						</div>
						<div id="facet-congress" class="panel-collapse facet-content collapse">
							<div class="panel-body">
								<div class="form-group">
									<label for="fromCongress" class="col-sm-5 control-label">From</label>
									<div class="col-sm-6">
										<input name="fromCongress" type="text" class="form-control" id="fromCongress" placeholder="From">
									</div>
								</div>
								<div class="form-group">
									<label for="toCongress" class="col-sm-5 control-label">To</label>
									<div class="col-sm-6">
										<input name="toCongress" type="text" class="form-control" id="toCongress" placeholder="To">
									</div>
								</div>
							</div>
						</div>
					</div>

					<div class="panel panel-primary">
						<div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-support">
							<h3 class="panel-title">Vote Outcome <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
						</div>
						<div id="facet-support" class="panel-collapse facet-content collapse">
							<div class="panel-body">
								<div class="form-group">
									<label for="support" class="col-sm-10 control-label">Percentage Support:</label>

									<div style="padding:30px;padding-bottom:0px;">
										<input id="support" name="support" type="text" class="span2" value="" 
											data-slider-min="0" data-slider-max="100" data-slider-step="1" data-slider-ticks="[0, 50, 100]" data-slider-value="[0,100]"
											data-slider-ticks-labels="['0%', '50%', '100%']" data-slider-ticks-snap-bounds="4" data-slider-tooltip-split="true"
											data-slider-id="support-bucket" >
									</div>
								</div>
							</div>
						</div>
					</div>


            <div class="panel panel-primary">
              <div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-clausen">
                <h3 class="panel-title">Subject Matter <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
              </div>
              <div id="facet-clausen" class="panel-collapse facet-content collapse">
                <div class="panel-body">
			<div class="checkbox">
				<label>
					<input type="checkbox" value="Government Management" name="clausen">
					Government Management
				</label>
			</div>

			<div class="checkbox">
				<label>
					<input type="checkbox" value="Miscellaneous Policy" name="clausen">
					Miscellaneous Policy
				</label>
			</div>

                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Foreign and Defense Policy" name="clausen">
                        Foreign and Defense Policy
                      </label>
                    </div>

                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Social Welfare" name="clausen">
                        Social Welfare
                      </label>
                    </div>

                    <div class="checkbox">
                     <label>
                        <input type="checkbox" value="Agriculture" name="clausen">
                        Agriculture
                      </label>
                    </div>

                    <div class="checkbox">
                     <label>
                        <input type="checkbox" value="Civil Liberties" name="clausen">
                        Civil Liberties
                      </label>
                    </div>

                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Internal Organization" name="peltzman">
                        Internal Organization
                      </label>
                    </div>

                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Foreign Policy Resolutions" name="peltzman">
                        Foreign Policy Resolutions
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Government Organization" name="peltzman">
                        Government Organization
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Regulation General Interest" name="peltzman">
                        Regulation General Interest
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Regulation Special Interest" name="peltzman">
                        Regulation Special Interest
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Budget Special Interest" name="peltzman">
                        Budget Special Interest
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Budget General Interest" name="peltzman">
                        Budget General Interest
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Defense Policy Budget" name="peltzman">
                        Defense Policy Budget
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Domestic Social Policy" name="peltzman">
                        Domestic Social Policy
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Defense Policy Resolutions" name="peltzman">
                        Defense Policy Resolutions
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Foreign Policy Budget" name="peltzman">
                        Foreign Policy Budget
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="Indian Affairs" name="peltzman">
                        Indian Affairs
                      </label>
                    </div>
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" value="D. C." name="peltzman">
                        D. C.
                      </label>
                    </div>

                </div>
              </div>
	    </div>
	    <div id="panel-keyvote" class="panel panel-primary">
	      <div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-keyvote">
		<h3 class="panel-title">Key Vote <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
	      </div>
	      <div id="facet-keyvote" class="panel-collapse facet-content collapse">
		<div class="panel-body">
		  <div class="checkbox">
		    <label>
		      <input type="checkbox" name="keyvote" id="optionsKeyvotes1" value="1">
			Any
		      </label>
		    </div>
		    <div class="checkbox">
		      <label>
			<input type="checkbox" name="keyvote" id="optionsKeyvotes2" value="CQ">
			  Congressional Quarterly
			</label>
		      </div>
		    </div>
		  </div>
		</div>
	      </div>
	      
		  
		<input type="hidden" name="sortD" id="sortD" value="-1">
		  <input type="hidden" name="sortScore" id="sortScore" value="1">
		  </form>
		  
			<div id="resultsHolder" class="col-md-12" style="float:right;">
				<div class="form-group">
					<div class="row">
						<div class="col-md-6">
							<h4 id="results-number"></h4>
						</div>
						<div class="col-md-6" style="padding-top:10px;text-align:right;vertical-align:top;" id="sortBy">
							<strong>Sort by </strong>
							<div id="relevanceAppear" style="display:none;"><a id="relevanceSort" href="#" onclick="javascript:$('#sortScore').val(1);updateRequest();return false;">Relevance</a> /</div>
							<a id="newestSort" href="#" onclick="javascript:$('#sortD').val(-1);$('#sortScore').val(0);updateRequest();return false;">Newest</a> / 
							<a id="oldestSort" href="#" onclick="javascript:$('#sortD').val(1);$('#sortScore').val(0);updateRequest();return false;">Oldest</a>
						</div>
					</div>
				</div>
				<form id="download-rollcalls-form" action="/api/downloadXLS" method="post">
					<div id="results-list">
					</div>
					<a id="next-page" href="#" class="btn btn-block btn-primary btn-lg">Load more</a> 
				</form>
			</div>
		</div>
	</div>
</div>

<!-- Top left stash bar -->
<div id="stashCartBar" class="carousel slide">
	<div class="carousel-inner">
		<!-- Carousel Item 1 -->
		<div class="item active">
			<div class="footerBig">
				Saved: <span id="oldResults"><big><strong id="oldCount">0</strong></big> results from previous searches.<br/>
				+</span> 
				<span id="newResults"><big><strong id="newCount">0</strong></big> new results from <span class="searchText"></span><br/>&nbsp;</span>
			</div>
			<div style="display:none;" id="addAll" class="footerBig">
				<a href="#" onClick="javascript:addAllVotes();return false;">Add all <big><strong class="searchResultNum">0</strong></big> results from <span class="searchText">all votes</span></a> <br/>
				<a href="#" onClick="javascript:delAllVotes();return false;">Delete all <big><strong class="searchResultNum">0</strong></big> results from <span class="searchText">all votes</span></a>
			</div>
			<div id="emptyCartIcon" class="footerIcon" onClick="javascript:emptyCart();">
				<span class="glyphicon glyphicon-trash" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Empty Saved Votes" data-container="body"></span>
			</div>	
			<div id="downloadVotesIcon" class="footerIcon" onClick="javascript:$('.carousel').carousel(1);">
				<span class="glyphicon glyphicon-file" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Download Saved Votes" data-container="body"></span>
			</div>
			<div id="createLinkIcon" class="footerIcon" onClick="javascript:$('.carousel').carousel(2);">
				<span class="glyphicon glyphicon-link" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Get Shareable Link" data-container="body"></span>
			</div>
		</div>
		<div class="item">
			<div class="footerIcon" data-toggle="tooltip" data-placement="top" title="Back to Stash Cart" onClick="javascript:$('.carousel').carousel(0);">
				<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>
			</div>
			<div class="footerIcon" id="exportXLS">
				<a href="#" onClick="javascript:exportXLS();return false;">Download to Excel</a>
			</div>
			<div class="footerIcon" id="exportJSON">
				<a href="#" onClick="javascript:exportJSON();return false;">Download to JSON</a>
			</div>
			<div class="footerIcon" id="format3">
				Download to Format3
			</div>
			<div class="footerIcon">
				<span onClick="javascript:loadSavedVotes();" class="glyphicon glyphicon-upload" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Load Votes into Search" data-container="body"></span>
			</div>
			<div class="footerBig" id="errorTooManyVotes" style="display:none;">
				You can only save stashes of 250 votes or less.<br/>If you would like to download our entire vote database, <a href="/data/">Click here</a>.
			</div>
		</div>
		<div class="item">
			<div class="footerIcon" data-toggle="tooltip" data-placement="top" title="Back to Stash Cart" onClick="javascript:$('.carousel').carousel(0);">
				<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>
			</div>
			<div class="footerBig">
				Create a permanent link for <big><strong id="totalVoteNumber">0</strong></big> votes: <br/>
				<span id="shareTextInput">http://voteview.polisci.ucla.edu/s/
					<input id="shareLinkText" type="text" placeholder="type-short-name"> 
					<input type="submit" value="Create" onClick="javascript:shareLink();javascript:clipboardCopyHack(document.getElementById('shareTextInput'))">
				</span>
				<span id="shareTextLink"></span>
			</div>
			<div class="footerBig">
				<span id="shareLinkStatus"></span><br/>&nbsp;
			</div>
		</div>
	</div>
</div>
<img id="stashCartClose" onClick="javacript:closeStashCart();" src="/static/img/close.png">
<div id="stashCartIcon" onClick="javascript:openStashCart();">
	<span class="glyphicon glyphicon-folder-open" aria-hidden="true" data-toggle="tooltip" data-placement="top" title="Saved Votes"></span>
</div>

<script>
	// Pass query string arguments back into faceted search.
	$(document).ready(function()
	{
		% if "q" in args:
		$("input[name='q']").val("{{args["q"]}}");
		% end
		% if "chamber" in args:
		$("input[value={{args["chamber"]}}]").attr("checked",true);
		% end
		% if "congress" in args:
		$("input[name='fromCongress']").val({{args["congress"]}});
		$("input[name='toCongress']").val({{args["congress"]}});
		% end
		% if "fromDate" in args:
		$("input[name='fromDate']").val('{{args["fromDate"]}}');
		% end
		% if "toDate" in args:
		$("input[name='toDate']").val('{{args["toDate"]}}');
		% end
		% if "supportMin" in args and "supportMax" in args:
		$("#support").slider({value: [{{args["supportMin"]}},{{args["supportMax"]}}]});
		% elif "supportMin" in args and not "supportMax" in args:
		$("#support").slider({value: [{{args["supportMin"]}},100]});
		% elif "supportMax" in args and not "supportMin" in args:
		$("#support").slider({value: [0,{{args["supportMax"]}}]});
		% else:
		$("#support").slider({});
		% end
		% if "keyvote" in args:
		$("input[value={{args["keyvote"]}}]").attr("checked",true);
		% end
		% if "chamber" in args or "congress" in args or "fromDate" in args or "toDate" in args or "supportMin" in args or "supportMax" in args:
		toggleAdvancedSearch(1);
		$("#support").slider('refresh');
		% end
	});		
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/search.js"></script>
