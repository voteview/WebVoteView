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
			var x = d.nominate.oneDimNominate;
			var y = d.nominate.twoDimNominate;
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
			hideMembersUnselected();
		}, 300);
	});

	dc.filterAll();
	dc.renderAll();
	decorateNominate(nominateScatterChart, resultCache);
}

function resort(sortB)
{
	sortBy = sortB;
	writeBioTable();	
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
	$("#memberList").fadeOut();
	$.ajax({
		dataType: "JSON",
		url: "/api/getmembersbycongress?congress="+congressNum+"&chamber="+chamber_param+"&api=Web_Congress",
		success: function(data, status, xhr)
		{
			$("#memberList").fadeIn();
			validSet = [];
			resultCache = data;
			writeBioTable();
			nomPlot();
			compositionBar();
		}
	});
}

function getVPP(congress)
{
	console.log(congress);
	var VPParty = {	"111": "Democrat", "107": "Republican", "103": "Democrat", "97": "Republican",
			"95": "Democrat", "91": "Republican", "87": "Democrat", "83": "Republican",
			"81": "Democrat", "80": "Vacant", "73": "Democrat", "67": "Republican",
			"63": "Democrat", "59": "Republican", "58": "Vacant", "55": "Republican",
			"53": "Democrat", "51": "Republican", "50": "Vacant", "49": "Democrat",
			"48": "Vacant", "41": "Republican", "40": "Vacant", "39": "Democrat",
			"37": "Republican", "35": "Democrat", "34": "Vacant", "33": "Democrat",
			"32": "Vacant", "31": "Whig", "29": "Democrat", "28": "Vacant", "27": "Whig",
			"25": "Democrat", "20": "Jackson", "15": "Democrat-Republican", "14": "Vacant",
			"5": "Democrat-Republican", "4": "Federalist", "1": "Pro-Administration"};

	var keys = Object.keys(VPParty);
	keys.reverse();
	for(var i=0;i!=keys.length;i++)
	{
		if(parseInt(keys[i])<=parseInt(congress)) { return VPParty[keys[i]]; }
	}
}

function compositionBar()
{
	var partyCount={}
	$.each(resultCache["results"], function(i, d) {
		if(partyCount[d.partyname]==undefined) { partyCount[d.partyname]=1; }
		else { partyCount[d.partyname]++; }
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
				.attr("fill",voteCol).attr("stroke","#000000").attr("stroke-width",1);
		x=x+wid;
		baseTipT += '<br/>'+pN+': '+partyCount[pN];
		if(chamber_param=="senate" && pN==getVPP(congressNum)) { baseTipT += " (+ Vice President)"; }
	}
	baseTipT+= "<br/><br><em>Note:</em> Counts include members elected through special elections after resignations, deaths, or vacancies.";
	svgBucket.on('mouseover',function(d) { 
		baseTip.html(baseTipT);
		baseTip.style("border-left","3px solid "+colorSchemes[partyColorMap[partyNameSimplify(maxP)]][0]);
		eW = baseTip.style('width');
		baseTip.style('visibility','visible');
	}).on('mousemove',function(d) {
		baseTip.style("top",(event.pageY+20)+"px").style("left", (event.pageX-(parseInt(eW.substr(0,eW.length-2))/2))+"px");
	}).on('mouseout',function(d) { baseTip.style('visibility','hidden'); });
}

function writeBioTable()
{
	rC = resultCache["results"];
	if(sortBy=="name" || sortBy==undefined) { rC.sort(function(a,b) { return a.bioName > b.bioName ? 1 : -1; }); }
	else if(sortBy=="party") { rC.sort(function(a,b) { return (a.partyname==b.partyname)?(a.bioName>b.bioName?1:-1):(a.partyname>b.partyname?1:-1); }); }
	else if(sortBy=="state") { rC.sort(function(a,b) { return(a.stateName==b.stateName)?(a.bioName>b.bioName?1:-1):(a.stateName>b.stateName?1:-1); }); }
	else if(sortBy=="elected") { rC.sort(function(a,b) { return (a.minElected==b.minElected)?(a.bioName>b.bioName?1:-1):(a.minElected>b.minElected?1:-1); }); }
	else if(sortBy=="nominate") { rC.sort(function(a,b) { return a.nominate.oneDimNominate > b.nominate.oneDimNominate ? 1 : -1; }); }
	$("#memberList").html("");
	$.each(rC,function(k, v)
	{
		constructPlot(v);
	});
	$('#content').fadeIn();
}

function hideMembersUnselected()
{
	$("#memberList > div").each(function(i, d) {
		if(validSet.indexOf(parseInt($(d).attr("id")))!=-1 || validSet.length==0) { $(d).show(); }
		else { $(d).hide(); }
	});
}

function constructPlot(member)
{
	// BioName cleanup:
	if(member["bioName"].length>20 && member["bioName"].indexOf("(")!=-1 && member["bioName"].indexOf(")")!=-1)
	{
		try
		{
			memberNameNew = member["bioName"].split(", ");
			parenthetical = member["bioName"].split("(")[1].split(")")[0];
			memberNameFinal = memberNameNew[0]+", "+parenthetical;
		}
		catch(err)
		{
			console.log(member["bioName"]);
		}		
	}
	else
	{
		memberNameFinal = member["bioName"];
	}

	var memberBox = $("<div></div>").addClass("col-md-3").addClass("memberResultBox").attr("id",member["icpsr"]).click(function(){window.location='/person/'+member["icpsr"];})
					.css("overflow","hidden").css("padding-right","5px");
	var imgBox = $("<img />").css("width","80px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/bios/"+member["bioImgURL"]);
	var bioText = $("<span></span>").css("font-size","0.9em").css("padding-right","0px")
					.html("<strong>"+memberNameFinal+"</strong><br/>"+member["partyname"]+"<br/><!--<img src=\"/static/img/states/"+member["stateAbbr"]+".png\" style=\"width:20px;\"> -->"+member["stateName"]+"<br/>Elected "+member["minElected"]);
	imgBox.appendTo(memberBox);
	bioText.appendTo(memberBox);
	memberBox.appendTo($("#memberList"));
}
