$("#congSelector").change(reloadIdeology);

(function loadData()
{
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum+"&api=Web_PI").await(drawHist);	
})();

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

function viewAllCong()
{
	window.location='/congress/'+chamber+'?congress='+congressNum;
}

function reloadIdeology()
{
	congressNum = $("#congSelector").val();
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum+"&api=Web_PI").await(drawHistWrap);
}

$(document).ready(function(){$('[data-toggle="tooltip"]').tooltip();});

// Wrapper to update default loadings for the person's ideal point.
function drawHistWrap(error, data)
{
	// Fail if we didn't get data.
	if(data==undefined) { return(0); }
	// Loop until you find the person.
	var foundRep = 0;
	data["results"].forEach(function(d) {
		if(!foundRep && d.icpsr==memberICPSR)
		{
			console.log(d);
			memberIdeal = d.nominate.oneDimNominate;
			memberPartyName = d.partyname;
			chamber = d.chamber.toLowerCase();
			$("#partyname").html("<a href=\"/parties/"+d.party+"\">"+memberPartyName+"</a>");
			memberIdealBucket = Math.floor(memberIdeal*10);
			foundRep=1;
			return false;
		}
		return false;
	});

	$("#congSelector").blur();

	// Now call the actual plotting function.
	drawHist(error, data);
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
	data["results"].forEach(function (d) {
		oneDims.push(d.nominate.oneDimNominate);
		ctTotal+=1;
		if(d.nominate.oneDimNominate>memberIdeal) { ctGreater+=1; }
		if(d.partyname==memberPartyName)
		{
			ctPartyTotal+=1;
			if(d.nominate.oneDimNominate>memberIdeal) { ctPartyGreater+=1; }
		}
	});

	var label = "<strong>Ideology Score:</strong> "+memberIdeal+" <em>(DW-NOMINATE first dimension)</em><br/><br/>";
	var libPercentage = Math.floor(100*ctGreater/(ctTotal-1),1);
	var libPartyPercentage = Math.floor(100*ctPartyGreater/(ctPartyTotal-1),1);
	if(libPercentage==100) { label += "The most liberal member of the "+getGetOrdinal(congressNum)+" Congress."; }
	else if(libPercentage==0) { label += "The most conservative member of the "+getGetOrdinal(congressNum)+" Congress."; }
	else
	{
		if(libPercentage>50) { label += "More liberal than "+libPercentage+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>"; }
		else { 	label += "More conservative than "+(100-libPercentage)+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>"; }

		if(ctPartyTotal>1)
		{
			if(libPartyPercentage==100) { label += "The most liberal "+memberPartyName+" of the "+getGetOrdinal(congressNum)+" Congress."; }
			else if(libPartyPercentage==0) { label += "The most conservative "+memberPartyName+" of the "+getGetOrdinal(congressNum)+" Congress."; }
			else if(libPartyPercentage>50) { label += "More liberal than "+libPartyPercentage+"% of "+memberPartyName+"s in the "+getGetOrdinal(congressNum)+" Congress."; }
			else { label += "More conservative than "+(100-libPartyPercentage)+"% of "+memberPartyName+"s in the "+getGetOrdinal(congressNum)+" Congress."; }
		}
	}

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
					try{
						return colorSchemes[partyColorMap[partyNameSimplify(memberPartyName)]][0];
					} catch(e) { return "#000000"; }
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
		.on('mouseover', function(d) { if(d.x==memberIdealBucket) { labelTip.attr('class','d3-tip animate').offset([-10,0]).show(d); }}) 
		.on('mouseout', function(d) { labelTip.attr('class','d3-tip').hide(); })
	});

	nominateHist.yAxis().ticks(0);

	nominateHist.filter = function() { };
	dc.renderAll();
	if(memberIdeal<0.73 && memberIdeal>-0.85)
	{
		setTimeout(function(){
			var leftNumber = ((memberIdeal+1)/2) * (d3.select("svg").attr("width")-30);
			var addTick = d3.select("svg g g.x").append("g").attr("transform","translate("+leftNumber+",13)");
			var addTri = addTick.append("path").attr("d", d3.svg.symbol().type("triangle-up").size(30));
		},200);
	}
	else
	{
		setTimeout(function(){
			var leftNumber = ((memberIdeal+1)/2) * (d3.select("svg").attr("width")-30);
			var addTick = d3.select("svg g g.x").append("g").attr("transform","translate("+leftNumber+",-28)");
			var addTri = addTick.append("path").attr("d", d3.svg.symbol().type("triangle-down").size(30));
		},200);		
	}
}

function loadSavedVotes()
{
	if(cookieId.length)
	{
		$("#memberSearchBox").val("saved: "+cookieId);
		startNewSearch()
	}
}

function startNewSearch()
{
	globalNextId=0;
	nextPageSearch();
}

function nextPageSearch()
{
		if(!globalNextId) $("#memberVotesTable").animate({opacity: 0});
		else $("#loadIndicator").fadeIn();
		$.ajax("/api/getMemberVotesAssemble?icpsr="+memberICPSR+"&qtext="+$("#memberSearchBox").val()+"&skip="+globalNextId, 	
			{"type": "GET", "success": function(d, status, xhr)
				{
					if($('#memberSearch').val().length) { $("#voteLabel").html("Search Results"); console.log('fwd'); }
					else { $("#voteLabel").html("Selected Votes"); console.log('back'); }
					if(!globalNextId) $("#memberVotesTable").animate({opacity: 1});

					if(globalNextId==0) { $('#memberVotesTable').html(d); }
 					else { $('#voteDataTable > tbody').append(d); }

					globalNextId = xhr.getResponseHeader("Nextid");
					if(globalNextId==0) { $("#nextVotes").fadeOut(); }
					else { $("#nextVotes").fadeIn(); }

					$('[data-toggle="tooltip"]').tooltip();
					$("#loadIndicator").hide();
					$("#voteDataTable").trigger("update");
				}});
	return;
}

$.tablesorter.addParser({
	id: 'splitFunc', is: function(s) { return false },
	format: function(s) 
	{ 
		var numbers = s.split("-");
		if(parseInt(numbers[1])==0 && parseInt(numbers[0])>0) { return 1; }
		else if(parseInt(numbers[1])==0) { return 0; }
		else { return parseFloat(numbers[0])/parseFloat(numbers[1]); }
	},
	type: 'numeric'
});
$(document).ready(function(){
	cookieId = Cookies.get('stash_id');
	if(cookieId==undefined || cookieId.length<8) $('#loadStash').hide();
	else
	{
		$.ajax("/api/stash/get?id="+cookieId, {"type": "GET", "success": function(d, status, xhr)
			{
				if(d["old"].length || d["votes"].length) { $("#loadStash").show(); console.log('Stash votes exist.'); }
				else { $("#loadStash").hide(); console.log('No stash votes.'); }
			}});
	}
	$("#voteDataTable").tablesorter({headers: {5: {sorter: 'splitFunc'}}});
});
