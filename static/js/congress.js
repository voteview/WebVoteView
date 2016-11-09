var updateFilterTimer;
var resultCache;
var validSet;
var sortBy;
var nominateScatterChart = dc.scatterPlot("#scatter-chart");
var baseTip = d3.select("body").append("div").attr("class", "d3-tip").style("visibility","hidden").attr("id","mapTooltip");
var eW;

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

$(document).ready(function()
{
	congressNum = $("#congSelector").val();	
	$.ajax({
		dataType: "JSON",
		url: "/api/getmembersbycongress?congress="+congressNum+"&chamber="+chamber_param+"&api=Web_Congress",
		success: function(data, status, xhr)
		{
			$('#content').fadeIn();
			$('#loading-container').slideUp();
			resultCache = data;
			writeBioTable();
			nomPlot();
			compositionBar();
		}
	});

	$("#congSelector").change(reloadBios);
});

function nomPlot()
{
	console.log('ok');
	var ndx = crossfilter(resultCache["results"]);
	var all = ndx.groupAll();
	var xDimension = ndx.dimension(
		function(d) 
		{
			if(d.nominate!=undefined)
			{
				var x = d.nominate.dim1;
				var y = d.nominate.dim2;
			}
			else
			{
				var x = 999;
				var y = 999;
			}
			return [x,y];
		}
	);
	var xGroup = xDimension.group().reduce(
		function(p, d)
		{
			p.members.push(d);
			return p;
		},
	
		function(p, d)
		{
			var index = p.members.indexOf(d);
			if(index > -1) { p.members.splice(index, 1); }
			return p;
		},
	
		function() { return {members: []} ; }
	);

	nominateScatterChart
	.width(890)
	.height(432)
	.margins({top:25,right:25,bottom:75,left:75})
	.dimension(xDimension)
	.mouseZoomable(false)
	.group(xGroup)
	.data(function(group) { return group.all().filter(function(d) { return d.key!=[999,999]; });})
	.symbolSize(7)
	.colorCalculator(function(d) {
		var color = "#CCC";
		try {
			if(d.value.members.length > 0){
				color = blendColors(d.value.members);
			}
		}catch(e){
			console.log(e);
		}
		return color;
	})
	.highlightedSize(10)
	.x(d3.scale.linear().domain([-1.0,1.0]))
	.y(d3.scale.linear().domain([-1.2,1.2]));

	nominateScatterChart.on("filtered", function()
	{
		if(updateFilterTimer) { clearTimeout(updateFilterTimer); }
		updateFilterTimer = setTimeout(function()
		{
			var filterSelect= xDimension.top(Infinity);
			validSet = [];
			for(var i in filterSelect)
			{
				validSet.push(filterSelect[i].icpsr);
			}
			hasFilter=1;
			hideMembersUnselected();
		}, 300);
	});

	dc.filterAll();
	dc.renderAll();
	decorateNominate(nominateScatterChart, resultCache);
}

function rechamber()
{
	if(chamber_param=="house") { chamber_param="senate"; $("#memberLabel").html("Senators"); }
	else { chamber_param="house"; $("#memberLabel").html("Representatives"); }
	reloadBios();
}

function reloadBios()
{
	congressNum = $("#congSelector").val();
	$.ajax({
		dataType: "JSON",
		url: "/api/getmembersbycongress?congress="+congressNum+"&chamber="+chamber_param+"&api=Web_Congress",
		success: function(data, status, xhr)
		{
			validSet = [];
			resultCache = data;
			$("#sortChamber").unbind('click')
			$("#sortChamber").click(function() { resort('elected_'+chamber_param); return false; });
			writeBioTable();
			nomPlot();
			compositionBar();
		}
	});
}

function getVPP(congress)
{
	// This is a hack; we just list thresholds at which the VP/ President of the Senate switches
	var VPParty = {	"115": "Republican", "111": "Democrat", "107": "Republican", "103": "Democrat", 
			"97": "Republican", "95": "Democrat", "91": "Republican", "87": "Democrat", 
			"83": "Republican", "81": "Democrat", "80": "Vacant", "73": "Democrat", 
			"67": "Republican", "63": "Democrat", "59": "Republican", "58": "Vacant", 
			"55": "Republican", "53": "Democrat", "51": "Republican", "50": "Vacant", 
			"49": "Democrat", "48": "Vacant", "41": "Republican", "40": "Vacant", 
			"39": "Democrat", "37": "Republican", "35": "Democrat", "34": "Vacant", 
			"33": "Democrat", "32": "Vacant", "31": "Whig", "29": "Democrat", 
			"28": "Vacant", "27": "Whig", "25": "Democrat", "20": "Jackson", 
			"15": "Democrat-Republican", "14": "Vacant", "5": "Democrat-Republican", 
			"4": "Federalist", "1": "Pro-Administration"};

	// Sort the dict keys and reverse them so the short-circuit in the loop below works
	var keys = Object.keys(VPParty);
	keys.reverse();

	// Iterate through keys until we find the bucket we're in
	for(var i=0;i!=keys.length;i++)
	{
		// We just return party name.
		if(parseInt(keys[i])<=parseInt(congress)) { return VPParty[keys[i]]; }
	}
}

function compositionBar()
{
	var partyCount={}
	$.each(resultCache["results"], function(i, d) {
		if(partyCount[d.party_short_name]==undefined) { partyCount[d.party_short_name]=1; }
		else { partyCount[d.party_short_name]++; }
	});
	
	$("#partyComposition").html("");
	var svgBucket = d3.select("#partyComposition").append("svg").attr("width",300).attr("height",21);
	var x=0; 
	var sorted_parties = Object.keys(partyCount).sort();
	
	var baseTipT = "<strong>Party Composition of "+getGetOrdinal(congressNum)+" "+chamber_param.substr(0,1).toUpperCase()+chamber_param.substr(1)+"</strong><br/>";
	var maxN = 0; var maxP = 0; var sumSet=0;
	for(pNi in sorted_parties)
	{
		pN = sorted_parties[pNi];
		if(partyCount[pN]>maxN || (partyCount[pN]==maxN && pN==getVPP(congressNum) && chamber_param=="senate")) { maxN=partyCount[pN]; maxP = pN; }
		var wid = Math.round(300*(partyCount[pN]/resultCache["results"].length));
		try {var voteCol = colorSchemes[partyColorMap[partyNameSimplify(pN)]][0]; } catch(e) { var voteCol = '#000000'; }
		var rect = svgBucket.append("rect")
				.attr("x",x).attr("y",3).attr("width",wid).attr("height",15)
				.attr('class',partyColorMap[partyNameSimplify(pN)])
				//.attr("fill",voteCol)
				.attr("stroke","#000000").attr("stroke-width",1);
		x=x+wid;
		baseTipT += '<br/>'+pN+': '+partyCount[pN];
		if(chamber_param=="senate" && pN==getVPP(congressNum)) { baseTipT += " (+ Vice President)"; }
	}
	baseTipT+= "<br/><br><em>Note:</em> Counts include members elected through special elections after resignations, deaths, or vacancies.";
	svgBucket.on('mouseover',function(d) { 
		baseTip.html(baseTipT);
		$('#mapTooltip').removeClass().addClass('d3-tip')
				.addClass(partyColorMap[partyNameSimplify(maxP)]);
		eW = baseTip.style('width');
		baseTip.style('visibility','visible');
	}).on('mousemove',function(d) {
		baseTip.style("top",(event.pageY+20)+"px").style("left", (event.pageX-(parseInt(eW.substr(0,eW.length-2))/2))+"px");
	}).on('mouseout',function(d) { baseTip.style('visibility','hidden'); });
}

function hideMembersUnselected()
{
	$("#memberList > li.memberResultBox").each(function(i, d) {
		if(validSet.indexOf(parseInt($(d).attr("id")))!=-1 || validSet.length==0) { $(d).show(); }
		else { $(d).hide(); }
	});
}

