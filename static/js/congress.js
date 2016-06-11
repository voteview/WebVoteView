var resultCache;
var sortBy = "elected";
var nominateScatterChart = dc.scatterPlot("#scatter-chart");

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

$(document).ready(function()
{
	$.ajax({
		dataType: "JSON",
		url: "/api/getmembersbycongress?congress="+congressNum+"&chamber="+chamber_param+"&api=Web_Congress",
		success: function(data, status, xhr)
		{
			$('#loading-container').slideUp();
			resultCache = data;
			writeBioTable();
			nomPlot();
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
			var R = Math.sqrt(x*x + y*y);
			if (R>1.2)
			{
				x = x*1.2/R;
				y = y*1.2/R;
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
	.width(600)
	.height(600)
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
		}
		return color;
	})
	.highlightedSize(7)
	.x(d3.scale.linear().domain([-1.2,1.2]))
	.y(d3.scale.linear().domain([-1.2,1.2]));

	dc.renderAll();
	decorateNominate(nominateScatterChart, resultCache);
}

function resort(sortB)
{
	sortBy = sortB;
	writeBioTable();	
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
			resultCache = data;
			writeBioTable();
			nomPlot();
		}
	});
}

function writeBioTable()
{
	rC = resultCache["results"];
	if(sortBy=="name") { rC.sort(function(a,b) { return a.bioName > b.bioName ? 1 : -1; }); }
	else if(sortBy=="party") { rC.sort(function(a,b) { return (a.partyname==b.partyname)?(a.bioName>b.bioName?1:-1):(a.partyname>b.partyname?1:-1); }); }
	else if(sortBy=="state") { rC.sort(function(a,b) { return(a.stateName==b.stateName)?(a.bioName>b.bioName?1:-1):(a.stateName>b.stateName?1:-1); }); }
	else if(sortBy=="elected") { rC.sort(function(a,b) { return (a.minElected==b.minElected)?(a.bioName>b.bioName?1:-1):(a.minElected>b.minElected?1:-1); }); }
	$("#memberList").html("");
	$.each(rC,function(k, v)
	{
		constructPlot(v);
	});
	$('#content').fadeIn();
}

function constructPlot(member)
{
	var memberBox = $("<div></div>").attr("class","col-md-3").attr("id","memberResultBox").click(function(){window.location='/person/'+member["icpsr"];})
	var imgBox = $("<img />").css("width","80px").css("height","80px").css("padding-right","20px").css("vertical-align","middle").attr("class","pull-left")
					.attr("src","/static/img/bios/"+member["bioImgURL"]);
	var bioText = $("<div></div>").css("font-size","0.9em").css("vertical-align","middle").css("padding-top","15px")
					.html("<strong>"+member["bioName"]+"</strong><br/>"+member["partyname"]+", "+member["stateName"]+"<br/>Elected "+member["minElected"]);
	imgBox.appendTo(memberBox);
	bioText.appendTo(memberBox);
	memberBox.appendTo($("#memberList"));
}
