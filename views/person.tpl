% STATIC_URL = "/static/"
% rebase("base.tpl",title=person["canonicalName"], extra_css=["map.css"])
% include('header.tpl')
% current_page_number = 1
% import datetime
% if len(person["yearsOfService"]) and person["yearsOfService"][-1][1]>datetime.datetime.now().year:
%	label = "Serving"
% else:
%	label = "Served"
% end
% if "born" in person and "died" in person:
% 	lifeString = "("+str(person["born"])+"-"+str(person["died"])+")"
% elif "born" in person and not "died" in person and person["born"]<1900:
%	lifeString = "("+str(person["born"])+"-??)"
% elif "born" in person and not "died" in person:
%	lifeString = "("+str(person["born"])+"-)"
% elif "died" in person:
%	lifeString = "(??-"+str(person["died"])+")"
% else:
%	lifeString = ""
% end
% plotIdeology=0
% if "nominate" in person and "oneDimNominate" in person["nominate"] and person["nominate"]["oneDimNominate"] is not None:
%	plotIdeology = 1
% end
<div class="container">

    <div class="row">
        <div class="col-md-2">
            <img src="{{ STATIC_URL }}img/bios/{{person["bioImg"]}}" style="max-width:160px;">
        </div>
        <div class="col-md-5">
		<h2 style="word-wrap:break-word;">
			{{ person["canonicalName"] }} {{lifeString}}
		</h2>

            <h4><span id="partyname"><a href="/parties/{{person["party"]}}">{{ person["partyname"] }}</a></span> (<img src="/static/img/states/{{ person["stateAbbr"]}}.png" style="width:20px;"> {{ person["stateName"] }})</h4>
	    <h4>{{ label }}
		% z = 0
		% for chunk in person["yearsOfService"]:
			% if chunk[1]>2016:
			% chunk[1] = "Present"
			% end
			% if z>0:
				, 
			% end
			{{chunk[0]}}-{{chunk[1]}}
			% z = z + 1
		% end
	    </h4>
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
	 	 	<a href="/person/{{ str(alt["icpsr"]).zfill(6) }}">{{ alt["partyname"] }}</a> (
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
		<h5>Web: <a href="{{person["website"]}}" target="_blank">{{person["website"]}}</a></h5>
	    % end
	    % if "twitter" in person:
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
	% if "bio" in person:
	<div class="row">
		<div class="col-md-9 col-md-offset-2">
			<h3>Biography</h3>
			{{ person["bio"] }}
			<br/><small><em>Courtesy of <a href="http://bioguide.congress.gov/biosearch/biosearch.asp">Biographical Directory of the United States Congress</a></em></small>
		</div>
	</div>
	% end
    <div class="row">
        <div class="col-md-9 col-md-offset-2">
            <h3>Selected Votes</h3>
                <table class="table table-hover dc-data-table">
                    <thead>
                    <tr class="header">
                        <th>Date</th>
                        <th>Description</th>
                        <th>Link</th>
                    </tr>
                    </thead>
                    % for vote in votes:
                        <tr style="cursor:pointer;" onclick="javascript:window.location='/rollcall/{{vote["id"]}}';">
                            <td>{{ vote["date"] }}</td>
                            <td>{{ vote["shortdescription"] }}</td>
                            <td><a class="btn btn-primary btn-sm" href="/rollcall/{{vote["id"]}}">See vote</a></td>
                        </tr>
                    % end
                </table>
            <nav>
	<!--
            <ul class="pager">
                % if current_page_number != 1:
                    <li class="previous"><a href="?page={{ current_page_number-1 }}"><span aria-hidden="true">&larr;</span> Previous</a></li>
                % end

                    <li class="next"><a href="?page={{current_page_number+1 }}">Next <span aria-hidden="true">&rarr;</span></a></li>
            </ul>
	-->
            </nav>
        </div>
    </div>
</div>
% if plotIdeology:
<script>
var mapParties=1;
% if person["chamber"]=="House":
	var chamber = "house";
% else:
	var chamber = "senate";
% end
var memberICPSR = {{person["icpsr"]}};
var congressNum = {{person["congress"]}};
var memberIdeal = {{person["nominate"]["oneDimNominate"]}};
var memberIdealBucket = Math.floor({{person["nominate"]["oneDimNominate"]}}*10);
var memberPartyName = "{{person["partyname"]}}";
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/personIdeology.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
% end
