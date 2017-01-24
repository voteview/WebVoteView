% import datetime
% STATIC_URL = "/static/"
% rcSuffix = lambda n: "%d%s" % (n,"tsnrhtdd"[(n/10%10!=1)*(n%10<4)*n%10::4])
% rebase("base.tpl",title=person["bioname"], extra_js=["/static/js/libs/jquery.tablesorter.min.js"],extra_css=["map.css"])
% include('header.tpl')
% current_page_number = 1
% import datetime

% if "died" in person and person["yearsOfService"][-1][1]>person["died"] and person["died"] is not None:
%       person["yearsOfService"][-1][1] = person["died"]
% end
% if "born" in person and "died" in person and person["born"] is not None and person["died"] is not None:
% 	lifeString = "("+str(person["born"])+"-"+str(person["died"])+")"
% elif ("born" in person and person["born"] is not None) and (not "died" in person or person["died"] is None) and person["born"]<1900:
%	lifeString = "("+str(person["born"])+"-??)"
% elif ("born" in person and person["born"] is not None) and (not "died" in person or person["died"] is None):
%	lifeString = "("+str(person["born"])+"-)"
% elif "died" in person and person["died"] is not None:
%	lifeString = "(??-"+str(person["died"])+")"
% else:
%	lifeString = ""
% end
% plotIdeology=0
% if "nominate" in person and "dim1" in person["nominate"] and person["nominate"]["dim2"] is not None:
%	plotIdeology = 1
% end
% person["last_name"] = person["bioname"].split(",")[0].upper()[0]+person["bioname"].split(",")[0].lower()[1:]
% orgMapping = {"cq": "Congressional Quarterly", "gov": "Congress.gov", "vv": "Voteview Staff"}
% if person["state"]!="President":
% 	stateText = " of "+person["state"]+' <img src="/static/img/states/'+person["state_abbrev"]+'.png" style="width:20px;vertical-align:middle;">' 
% else:
%	stateText = ', President of the United States <img src="/static/img/states/US.png" style="width:20px;vertical-align:middle;">'
% end
<div class="container">
    <div class="row">
        <div class="col-md-2">
            <img src="{{ STATIC_URL }}img/bios/{{person["bioImg"]}}" style="max-width:160px;padding-right:5px;">
        </div>
        <div class="col-md-5">
		<h2 style="word-wrap:break-word;">
			{{ person["bioname"] }} {{lifeString}}
		</h2>

            <h4>
		<span id="partyname"><a href="/parties/{{person["party_code"]}}">{{ person["party_noun"] }}</a></span>{{!stateText}}
	    </h4>

	    % for serviceSet in ["Senate", "House"]:
		% if "yearsOfService"+serviceSet in person and len(person["yearsOfService"+serviceSet]):
	    <h4>
		% if person["yearsOfService"+serviceSet][-1][1]>datetime.datetime.now().year:
			Serving in {{serviceSet}}
		% else:
			Served in {{serviceSet}}
		% end

		% z = 0
		% for chunk in person["yearsOfService"+serviceSet]:
			% if chunk[1]>=datetime.datetime.now().year:
			% chunk[1] = "Present"
			% end
			% if z>0:
				, 
			% end
			{{chunk[0]}}-{{chunk[1]}}
			% z = z + 1
		% end
	    </h4>
		% end
	    % end
	    % if "altPeople" in person and len(person["altPeople"]):
	    <h5>
		% k = 0
		% for alt in person["altPeople"]:
			% if alt["yearsOfService"][0][0]>=person["yearsOfService"][-1][0]:
			Subsequently served as 
			% elif alt["yearsOfService"][-1][1]<=person["yearsOfService"][0][1]:
			Previously served as 
			% end
			% if k>0:
				, 
			% end
	 	 	<a href="/person/{{ str(alt["icpsr"]).zfill(6) }}">{{ alt["party_noun"] }}</a> (
			% z = 0
			% for chunk in alt["yearsOfService"]:
				% if z > 0:
					, 
				% end
				{{chunk[0]}}-{{chunk[1]}}
			% end
		 )
		% k = k + 1
		% end
	    </h5>
	    % end
	    % if "website" in person:
		<h5><a href="{{person["website"]}}" target="_blank">Official Website</a></h5>
	    % end
	    % if "twitter" in person and len(person["twitter"]):
		<h5><img src="/static/img/twitter.png" title="Twitter:"> <a href="http://www.twitter.com/{{person["twitter"]}}" target="_blank">@{{person["twitter"]}}</a></h5>
	    % end
        </div>
	% if plotIdeology:
	<div class="col-md-4">
		<div id="nominateHist" class="dc-chart">
			<h5 style="padding-top:20px;padding-bottom:0px;">
				Ideology
				% if len(person["congressLabels"])>1:
					<select id="congSelector">
				% 	person["congressesOfService"].reverse()
				%	for congressRun in person["congressesOfService"]:
				%		for congress in range(congressRun[1], congressRun[0]-1, -1):
							<option value="{{congress}}">{{person["congressLabels"][congress]}}</option>
				% 		end
				% 	end
					</select>
				% end
				<small style="padding-left:10px;"><a href="#" onclick="javascript:viewAllCong();return false;">View all members</a></small>
			</h5>
		</div>
	</div>
	% end
    </div>
	% if "biography" in person:
	<div class="row">
		<div class="col-md-12">
			<h3>Biography</h3>
			{{ !person["biography"] }}
			% if not "bioguide_id" in person:
			<br/><small><em>Courtesy of</em> <a href="http://bioguide.congress.gov/biosearch/biosearch.asp">The Biographical Directory of the United States Congress</a></small>
			% else:
			<br/><small><em>Courtesy of</em> <a href="http://bioguide.congress.gov/scripts/biodisplay.pl?index={{person["bioguide_id"]}}">Biographical Directory of the United States Congress</a></small>
			% end
		</div>
	</div>
	% end
	% if "biography" in person and "served_as_speaker" in person and person["served_as_speaker"] and person["chamber"]!="President":
	<div class="alert alert-warning">
		<strong>Notice:</strong> By custom, the Speaker of the House rarely votes. Votes for {{person["bioname"]}} may appear to be missing as a result.
	</div>
	% end
    <div class="row">
        <div class="col-md-12">
	    <form onsubmit="javascript:startNewSearch();return false;" class="form-horizontal">
	    <div id="search-container" style="padding-top:10px; padding-bottom:10px; clear:both;">
		<h3 id="voteLabel" style="float:left;">Selected Votes</h3>

		<div class="input-group" style="float:right; padding-top:12px; min-width:400px; width:400px;">
			<div id="memberSearch" class="input-group-btn">
				<button type="button" style="display:none;" 
					class="btn btn-primary" id="loadStash" 
					onClick="javascript:loadSavedVotes();return false;"
					data-toggle="tooltip" data-placement="top" title="Load Saved Votes into Search">
					<span class="glyphicon glyphicon-upload"></span>
				</button>
			</div>
			<input type="text" id="memberSearchBox" class="form-control">
			<div class="input-group-btn">
				<button id="submit-search-string" class="btn btn-primary"><span class="glyphicon glyphicon-search"></span></button>
			</div>
		</div>

		<span style="clear:both;display:block;"></span>
	    </div>
	    </form>

		<div id="memberVotesTable">
			%include('member_votes.tpl', skip=0)
		</div>
		<div style="float:right;">
			<a id="nextVotes" href="#" class="btn btn-block btn-primary btn-large" onClick="javascript:nextPageSearch();return false;">Next page</a> 
		</div>
		<div id="loadIndicator" style="float:right;margin-right:25px;display:none;">
			<img src="/static/img/loading.gif"> 
		</div>
        </div>
    </div>
</div>

<script>
var memberICPSR = {{person["icpsr"]}};
var congressNum = {{person["congress"]}};
var globalNextId = {{nextId}};
</script>
% if plotIdeology:
<script>
var mapParties=1;
% if person["chamber"]=="House":
	var chamber = "house";
% else:
	var chamber = "senate";
% end
var numBins = 15; // This is actually multiplied by 2, so 15*2 = 30.
var memberIdeal = {{person["nominate"]["dim1"]}};
var memberIdealBucket = Math.floor({{person["nominate"]["dim1"]}}*numBins);
var memberPartyName = "{{person["party_name"]}}";
var memberPartyCode = "{{person["party_code"]}}";
var memberNoun = "{{person["party_noun"]}}";
var partyColor = "{{person["party_color"]}}";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/personIdeology.js"></script>
% end
<script type-"text/javascript" src="{{ STATIC_URL }}js/personVotes.js"></script>
