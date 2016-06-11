var resultCache;
var sortBy = "elected";

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
			resultCache = data["results"];
			writeBioTable();
		}
	});

	$("#congSelector").change(reloadBios);
});

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
			resultCache = data["results"];
			writeBioTable();
		}
	});
}

function writeBioTable()
{
	if(sortBy=="name") { resultCache.sort(function(a,b) { return a.bioName > b.bioName ? 1 : -1; }); }
	else if(sortBy=="party") { resultCache.sort(function(a,b) { return (a.partyname==b.partyname)?(a.bioName>b.bioName?1:-1):(a.partyname>b.partyname?1:-1); }); }
	else if(sortBy=="elected") { resultCache.sort(function(a,b) { return (a.minElected==b.minElected)?(a.bioName>b.bioName?1:-1):(a.minElected>b.minElected?1:-1); }); }
	$("#memberList").html("");
	$.each(resultCache,function(k, v)
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
