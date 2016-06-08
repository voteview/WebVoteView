% STATIC_URL = "/static/"
% rebase("base.tpl",title="Person details", extra_css=["map.css"])
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
%	lifeString = "("+str(person["born"])+"- )"
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
		<h2>
			% if "bioName" in person and person["bioName"] is not None:
				{{ person["bioName"] }} {{lifeString}}
			% elif "fname" in person and person["fname"] is not None:
				{{ person["fname"] }} {{lifeString}}
			% else:
				{{ person["name"] }} {{lifeString}}
			% end
		</h2>

            <h4>{{ person["partyname"] }}</h4>
            <h4>{{ person["stateName"] }}, {{ person["stateAbbr"] }}</h4>
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
	    % end
        </div>
	% if plotIdeology:
	<div class="col-md-4">
		<div id="nominateHist" class="dc-chart">
			<h5 style="padding-top:20px;padding-bottom:0px;">Ideology</h5>
		</div>
	</div>
	% end
    </div>
	% if "bio" in person:
	<div class="row">
		<div class="col-md-9 col-md-offset-2">
			<h3>Member Biography</h3>
			{{ person["bio"] }}
			<br/><small><em>Courtesy of <a href="http://bioguide.congress.gov/biosearch/biosearch.asp">Biographical Directory of the United States Congress</a></em></small>
		</div>
	</div>
	% end
    <div class="row">
        <div class="col-md-9 col-md-offset-2">
            <h3>Vote history</h3>
                <table class="table table-hover dc-data-table">
                    <thead>
                    <tr class="header">
                        <th>Date</th>
                        <th>Description</th>
                        <th>Link</th>
                    </tr>
                    </thead>
                    % for vote in votes:
                        <tr>
                            <td>{{ vote["date"] }}</td>
                            <td>{{ vote["shortdescription"] }}</td>
                            <td><a class="btn btn-primary btn-sm" href="/rollcall/{{vote["id"]}}">See vote</a></td>
                        </tr>
                    % end
                </table>
            <nav>
            <ul class="pager">
                % if current_page_number != 1:
                    <li class="previous"><a href="?page={{ current_page_number-1 }}"><span aria-hidden="true">&larr;</span> Previous</a></li>
                % end

                    <li class="next"><a href="?page={{current_page_number+1 }}">Next <span aria-hidden="true">&rarr;</span></a></li>
            </ul>
            </nav>
        </div>
    </div>
</div>
% if plotIdeology:
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/queue.v1.min.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/crossfilter.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/dc.js"></script>
<script type="text/javascript" src="{{ STATIC_URL }}js/libs/d3.tip.js"></script>
<script>
var mapParties=1;
var congressNum = {{person["congress"]}};
var memberIdeal = {{person["nominate"]["oneDimNominate"]}};
var memberIdealBucket = Math.floor({{person["nominate"]["oneDimNominate"]}}*10);
var memberPartyName = "{{person["partyname"]}}";

(function loadData()
{
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum).await(drawHist);	
})();

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

function drawHist(error, data)
{
	if(data==undefined)
	{
		return(0);
	}

	var ctGreater=0;
	var ctTotal=0;
	var ctPartyGreater=0;
	var ctPartyTotal=0;
	var oneDims = [];
	console.log(memberIdeal);
	data["results"].forEach(function (d) {
		oneDims.push(d.nominate.oneDimNominate);
		ctTotal+=1;
		if(d.nominate.oneDimNominate>memberIdeal) { ctGreater+=1; }
		if(d.party=={{person["party"]}})
		{
			ctPartyTotal+=1;
			if(d.nominate.oneDimNominate>memberIdeal) { ctPartyGreater+=1; }
		}
	});

	console.log(100*ctGreater/ctTotal);

	if(memberIdealBucket<0)
	{
		if(Math.floor(100*ctGreater/ctTotal,1)==100)
		{
			var label = "The most liberal member of the "+getGetOrdinal(congressNum)+" Congress.";
		}
		else
		{
			var label = "More liberal than "+Math.floor(100*ctGreater/ctTotal,1)+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>More liberal than "+Math.floor(100*ctPartyGreater/ctPartyTotal,1)+"% of co-partisans in the "+getGetOrdinal(congressNum)+" Congress.";
		}
		
	}
	else
	{
		if(Math.ceil(100*ctGreater/ctTotal,1)==0)
		{
			var label = "The most conservative member of the "+getGetOrdinal(congressNum)+" Congress.";
		}
		else
		{
			var label = "More conservative than "+(100-Math.ceil(100*ctGreater/ctTotal,1))+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>More conservative than "+(100-Math.ceil(100*ctPartyGreater/ctPartyTotal,1))+"% of co-partisans in the "+getGetOrdinal(congressNum)+" Congress.";
		}
	}
	console.log(label);
	var labelTip = d3.tip().attr('class', 'd3-tip').html(
		function(d)
		{
			if(d.x==memberIdealBucket) { return(label); }
			else { return(""); }
		});

	var ndx = crossfilter(oneDims);
	var oneDimDimension = ndx.dimension(function(d) { return d; });
	var oneDimGroup = oneDimDimension.group(function(d) { return Math.floor(d*10); });

	var nominateHist = dc.barChart("#nominateHist");
	nominateHist.width(420).height(130).margins({top: 10, right:10, bottom: 30, left:20})
	.dimension(oneDimDimension).group(oneDimGroup).elasticY(true).brushOn(false)
	.colorCalculator(function(d) 
			 { 
				if(d.key==memberIdealBucket)
				{
					return colorSchemes[partyColorMap[partyNameSimplify(memberPartyName)]][0];
				}
				else { return "#CCCCCC"; } 
			 })
	.renderTitle(false)
	.x(d3.scale.linear().domain([-10, 10]))
	.xAxis().ticks(20).tickFormat(function(v) 
	{
		if(v==-10) return "Liberal";
		else if(v==9) return "Conservative";
	});

	nominateHist.on("postRender", function(c){
		c.svg()
		.selectAll("rect")
		.call(labelTip)
		.on('mouseover', function(d) { if(d.x==memberIdealBucket) { labelTip.attr('class','d3-tip animate').show(d); }}) 
		.on('mouseout', function(d) { labelTip.attr('class','d3-tip').hide(); })
	});

	nominateHist.yAxis().ticks(0);

	nominateHist.filter = function() { };

	dc.renderAll();
}
</script>
<script type="text/javascript" src="{{ STATIC_URL }}js/colorMap.js"></script>
% end
