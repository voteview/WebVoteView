% rebase("base.tpl", title="Search")

% include('header.tpl')
<div class="container">

  <div class="row">
    <div class="col-xs-12">
      <h3>Browse US roll calls</h3>
    </div>
  </div>

  <div id="results-page-container">
      <div class="row">
          <form id="faceted-search-form" action="." method="post" class="form-horizontal">

          <div id="search-bar-container" class="col-md-12">
            <div class="input-group">
              <input name="search-string" type="text" class="form-control" id="searchTextInput" placeholder="Enter a term to search for">
                <div class="input-group-btn">
                  <button id="submit-search-string" class="btn btn-primary"><span class="glyphicon glyphicon-search"></span></button>
                </div>
            </div>    
          </div>

          {% csrf_token %} 
          <div id="results-selects" class="col-md-3">

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
              <div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-clausen">
                <h3 class="panel-title">Clausen <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
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
                </div>
              </div>
            </div>


            <div class="panel panel-primary">
              <div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-peltzman">
                <h3 class="panel-title">Peltzman <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
              </div>
              <div id="facet-peltzman" class="panel-collapse facet-content collapse">
                <div class="panel-body">


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
                        <input type="checkbox" value="Regulation Special Interest
" name="peltzman">
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


            <div class="panel panel-primary">
              <div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-date">
                <h3 class="panel-title">Date range <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
              </div>
              <div id="facet-date" class="panel-collapse facet-content collapse">
                <div class="panel-body">
                  <div class="form-group">
                    <label for="fromDate" class="col-sm-5 control-label">From (year)</label>
                    <div class="col-sm-6">
                      <input name="from-date" type="text" class="form-control" id="fromDate" placeholder="From">
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="toDate" class="col-sm-5 control-label">To (year)</label>
                    <div class="col-sm-6">
                      <input name="to-date" type="text" class="form-control" id="toDate" placeholder="To">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="panel panel-primary">
              <div class="collapsed collapse-toggle panel-heading" data-toggle="collapse" data-target="#facet-session">
                <h3 class="panel-title">Session range <i class="indicator glyphicon glyphicon-chevron-down  pull-right"></i></h3>
              </div>
              <div id="facet-session" class="panel-collapse facet-content collapse">
                <div class="panel-body">
                  <div class="form-group">
                    <label for="fromSession" class="col-sm-5 control-label">From</label>
                    <div class="col-sm-6">
                      <input name="from-session" type="text" class="form-control" id="fromSession" placeholder="From">
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="toSession" class="col-sm-5 control-label">To</label>
                    <div class="col-sm-6">
                      <input name="to-session" type="text" class="form-control" id="toSession" placeholder="To">
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>

          <div class="col-md-9">
            <div class="form-group">
              <div class="row">
              <div class="col-md-7">
                 <h4 id="results-number"></h4>
              </div>
                <label id="sort-label" for="sort" class="col-md-2 control-label">Sort by</label>
                <div class="col-md-3">
                  <select id="sorting-select" name="sort" class="form-control">
                    <option value="date-desc" selected>date: newest first</option> 
                    <option value="date-asc">date: oldest first</option> 
                    <option value="session">session</option>
                  </select>
                </div>
              </div>
          </div>
            <a id="download-btn" class="btn btn-info" onclick="$('#download-rollcalls-form').submit()">Download selected roll calls to Excel</a>
            <form id="download-rollcalls-form" action="{% url 'download_excel' %}" method="post">
                {% csrf_token %} 
              <!--input id="url" name="url" type="hidden" value="{x{ request.get_full_path }x}" -->
              <div id="results-list">
                {# List of rollcalls goes here #}
              </div>
              <a id="next-page" href="#" class="btn btn-block btn-primary btn-lg">Load more</a> 
            </form>
          </div>
        </div>
      </div>
  </div>

  <script type="text/javascript" src="{{ STATIC_URL }}/js/search.js"></script>
