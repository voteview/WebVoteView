% STATIC_URL = "/static/"
% rebase("base.tpl", title="Search", extra_js=["/static/js/libs/bootstrap-slider.js"], extra_css=["bootstrap-slider.css"])
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

				</div>
				<input type="hidden" name="sortD" id="sortD" value="-1">
			</form>

			<div id="resultsHolder" class="col-md-12" style="float:right;">
				<div class="form-group">
					<div class="row">
						<div class="col-md-7">
							<h4 id="results-number"></h4>
						</div>
						<label id="sort-label" for="sort" class="col-md-2 control-label">Sort by</label>
						<div class="col-md-3" style="padding-top:10px;">
							<a href="#" onclick="javascript:$('#sortD').val(-1);updateRequest();return false;">Newest</a> / 
							<a href="#" onclick="javascript:$('#sortD').val(1);updateRequest();return false;">Oldest</a>
						</div>
					</div>
				</div>
				<a id="download-btn" class="btn btn-info" onclick="javascript:exportVote(); $('#download-rollcalls-form').submit(); unselectAll();">Download selected roll calls to Excel</a>
				<form id="download-rollcalls-form" action="/api/downloadXLS" method="post">
					<div id="results-list">
					</div>
					<a id="next-page" href="#" class="btn btn-block btn-primary btn-lg">Load more</a> 
				</form>
			</div>
		</div>
	</div>
</div>


<script>
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
		% if "chamber" in args or "congress" in args or "fromDate" in args or "toDate" in args or "supportMin" in args or "supportMax" in args:
		toggleAdvancedSearch(1);
		$("#support").slider('refresh');
		% end
	});		
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/search.js"></script>
