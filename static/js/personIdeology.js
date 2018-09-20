$("#congSelector").change(reloadIdeology);
$(".nav-tabs > li > a").click(switchTab);

(function loadData()
{
	$("#view_all_members").attr("href", "/congress/" + chamber + "/" + congressNum);
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum+"&api=Web_PI").await(fillLoyaltyDrawHist);	
})();

function switchTab(e) {
	// If we're aleady highlighted, no need to do anything.
	if($(e.target).parent().attr("class") == "active") { return false; }

	// Show the new element.
	$("#" + $(e.target).parent().parent().children(".active").children("a").attr("data-toggle")).css("display", "none");
	$("#" + $(e.target).attr("data-toggle")).css("display", "block");

	// Toggle the tabs.
	$(e.target).parent().parent().children(".active").removeClass("active");
	$(e.target).parent().addClass("active");

	return false;
}

function getMedian(data, type) {
	// Sort data
	function sortVotes(a, b) { return a[0] - b[0]; }
	function sortLoyalty(a, b) { return (a[1] / a[0]) - (b[1] / b[0]); }
	function sortAttendance(a, b) { return (a[0] / (a[0] + a[2])) - (b[0] / (b[0] + b[2])); }
	var sortedData = data.sort(type == "votes" ? sortVotes : type == "loyalty" ? sortLoyalty : sortAttendance);

	// Okay, which is the median position
	var middlePos = Math.floor((data.length - 1) / 2);

	// Extractor functions for quantities of interest
	function extractVote(item) { return item[0]; }
	function extractLoyalty(item) { return 100 * (1 - (item[1] / item[0])); }
	function extractAttendance(item) { return 100 * (item[0] / (item[0] + item[2])); }

	// Simple case: single median
	if(sortedData.length % 2) 
	{
		var item = sortedData[middlePos];
		var out = type == "votes" ? extractVote(item) : type == "loyalty" ? extractLoyalty(item) : extractAttendance(item);
	}
	// More complex case, median is mean of middle 2.
	else
	{
		var item1 = sortedData[middlePos];
		var out1 = type == "votes" ? extractVote(item1) : type == "loyalty" ? extractLoyalty(item1) : extractAttendance(item1);

		var item2 = sortedData[middlePos + 1];
		var out2 = type == "votes" ? extractVote(item2) : type == "loyalty" ? extractLoyalty(item2) : extractAttendance(item2);

		var out = (out1 + out2) / 2.0;
	}
	
	// Round attendance / loyalty, but don't round votes.
	return type == "votes" ? out : Math.round(out, 1);   
}

// From stackoverflow response, who borrowed it from Shopify--simple ordinal suffix.
function getGetOrdinal(n) {
    var s=["th","st","nd","rd"],
    v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
 }

// Runs when we switch congresses.
function reloadIdeology()
{
	congressNum = $("#congSelector").val();
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum+"&api=Web_PI").await(updateCongress);
}

// Wrapper to update default loadings for the person's ideal point.
function updateCongress(error, data)
{
	// Fail if we didn't get data.
	if(data==undefined) { return(0); }

	// Select the member that matches
	var d = data["results"].filter(function(p) { return p.icpsr == memberICPSR; })[0];

	// Update our globals.
	memberIdeal = d.nominate.dim1;
	memberPartyCode = d.party_code;
	memberNoun = d.party_noun;
	partyColor = d.party_color;
	chamber = d.chamber.toLowerCase();
	memberVotes = d.nvotes_yea_nay;
	memberAttendance = 100 * (d.nvotes_yea_nay / (d.nvotes_yea_nay + d.nvotes_abs));
	memberLoyalty = 100 * (1 - d.nvotes_against_party / d.nvotes_yea_nay);

	// Update link to all members of congress.
	$("#view_all_members").attr("href", "/congress/" + chamber + "/" + congressNum);

	// Update party name in case it switched
	$("#partyname").html("<a href=\"/parties/" + d.party_code + "\">" + memberNoun + "</a>");

	// Only show district info if they are in the house and in a real district.
	if(d.district_code != undefined && [0, 98, 99].indexOf(d.district_code) == -1)
	{
		$("#district_label").html(getGetOrdinal(d.district_code)+" congressional district");
		$("#show_district").css("display","block");
	}
	else $("#show_district").css("display","none");

	// Which bucket are they in?
	memberIdealBucket = Math.floor(memberIdeal * numBins);

	// Deselect and redraw.
	$("#congSelector").blur();
	fillLoyaltyDrawHist(error, data);
}

function fillLoyaltyDrawHist(error, data)
{
	if(data == undefined) { return(0); }

	// For loyalty scores
        var partyVotes=[];
        var chamberVotes=[];

	// For ideology scores
	var congressNom = [];
	var partyNom = [];
	var chamberNom = [];
	var partyChamberNom = [];
	
	// Iterate through data, building chamber and party results.
	data["results"].forEach(function (d) {
		// Skip people with no NOMINATE score.
		if(d.nominate==undefined) { return true; }

		// Log NOMINATE scores into arrays as appropriate.
		congressNom.push(d.nominate.dim1);
		if(d.party_code == memberPartyCode && d.chamber.toLowerCase() == chamber)
		{
			partyNom.push(d.nominate.dim1);
			chamberNom.push(d.nominate.dim1);
			partyChamberNom.push(d.nominate.dim1);
		}
		else if(d.party_code == memberPartyCode) partyNom.push(d.nominate.dim1);
		else if(d.chamber.toLowerCase() == chamber) chamberNom.push(d.nominate.dim1);

		if(d.chamber.toLowerCase() == chamber || chamber == 'president' || chamberTrue == 'President') {
			chamberVotes.push([d.nvotes_yea_nay, d.nvotes_against_party, d.nvotes_abs]);
		}

		// If the current member is in the requested member's party:
		if(d.party_code==memberPartyCode)
		{
			if(d.chamber.toLowerCase() == chamber || chamber == 'president' || chamberTrue == 'President') {
				partyVotes.push([d.nvotes_yea_nay, d.nvotes_against_party, d.nvotes_abs]);
			}
	       }	    
	});

	// How many people are more conservative than this person?
	function reduceSum(total, num) { return total + num; }	
	function moreConservative(num) { return (memberIdeal > num); }
	var mc = congressNom.map(moreConservative).reduce(reduceSum, 0); // Overall
	var mcParty = partyNom.map(moreConservative).reduce(reduceSum, 0); // In their party
	var mcChamber = chamberNom.map(moreConservative).reduce(reduceSum, 0); // In their chamber
	var mcPartyChamber = partyChamberNom.map(moreConservative).reduce(reduceSum, 0); // In their party in their chamber

	// Okay, now convert to percentages.
	var conPct = 100 * mc / (congressNom.length - 1);
	var conPctChamber = 100 * mcChamber / (chamberNom.length - 1);
	var conPctPC = 100 * mcPartyChamber / (partyChamberNom.length - 1);

	// Prep label: first, capitalize chamber name.
	var chamberCap = chamber.substring(0, 1).toUpperCase() + chamber.substring(1);
	// and make the generic header.
	var label = "<strong>Ideology Score:</strong> "+memberIdeal+" <em>(DW-NOMINATE first dimension)</em><br/><br/>";
	// Waterfall labels: Requested is most liberal
	if(mc == 0) { label += "The most liberal member of the " + getGetOrdinal(congressNum) + " congress."; }
	else if(mc == congressNom.length - 1) { label += "The most conservative member of the " + getGetOrdinal(congressNum) + " congress."; }
	else if(mcChamber == 0) { label += "The most liberal member of the " + getGetOrdinal(congressNum) + " " + chamberCap; }
	else if(mcChamber == chamberNom.length - 1) { label += "The most conservative member of the " + getGetOrdinal(congressNum) + " " + chamberCap; }
	else
	{
		// They aren't superlative, let's compare them to their overall chamber and their party in that chamber.

		// First, overall -- how do they compare to their chamber?
		if(mcChamber > (chamberNom.length - 1) / 2) label += "More conservative than " + Math.floor(conPctChamber, 1) + "% of the " + getGetOrdinal(congressNum) + " " + chamberCap + "<br/>"; 
		else label += "More liberal than " + Math.floor(100 - conPctChamber, 1) + "% of the " + getGetOrdinal(congressNum) + " " + chamberCap + "<br/>";

		// Now, compared to their party?
		if(partyChamberNom.length > 1)
		{
			if(mcPartyChamber == 0) { label += "The most liberal " + memberNoun + " of the " + getGetOrdinal(congressNum) + " " + chamberCap + "."; }
			else if(mcPartyChamber == partyChamberNom.length - 1) { label += "The most conservative " + memberNoun + " of the " + getGetOrdinal(congressNum) + " " + chamberCap + "."; }
			else if(mcPartyChamber > (partyChamberNom.length - 1) / 2) { label += "More conservative than " + Math.floor(conPctPC, 1) + "% of " + memberNoun + "s in the " + getGetOrdinal(congressNum) + " " + chamberCap; }
			else { label += "More liberal than " + Math.floor(100 - conPctPC, 1) + "% of " + memberNoun + "s in the " + getGetOrdinal(congressNum) + " " + chamberCap; }
		}
	}

	// Tooltip for buckets: only have text in the member's bucket.
	var labelTip = d3.tip().attr('class', 'd3-tip').html(
		function(d)
		{
			if(d.x == memberIdealBucket) { return(label); }
			else { return(""); }
		});

	// Build loyalty table
	loyaltyTable(
		{"party": partyVotes, "chamber": chamberVotes},
		{"lastName": memberLastName, "noun": memberNoun, "votes": memberVotes, "attendance": memberAttendance, "loyalty": memberLoyalty, "party": memberPartyCode},
		{"chamberCap": chamberCap}
	);

	// Build crossfilter, because dc needs one for a histogram
	var ndx = crossfilter(chamberNom);
	var oneDimDimension = ndx.dimension(function(d) { return d; });
	var oneDimGroup = oneDimDimension.group(function(d) { return Math.floor(d*numBins); });

	// Build the histogram
	var nominateHist = dc.barChart("#nominateHist");
	nominateHist.width(420).height(110).margins({top: 10, right:10, bottom: 20, left:20})
	.dimension(oneDimDimension).group(oneDimGroup).elasticY(true).brushOn(false)
	.colorCalculator(function(d) 
			 { 
				if(d.key==memberIdealBucket)
				{
					try{
						return colorSchemes[partyColor][0];
					} catch(e) { return "#000000"; }
				}
				else { return "#CCCCCC"; } 
			 })
	.renderTitle(false)
	.x(d3.scale.linear().domain([-numBins, numBins]))
	.xAxis().ticks(numBins*2).tickFormat(function(v) 
	{
		if(v==-numBins) return "Liberal";
		else if(v==numBins-(1*Math.ceil(numBins/10))) return "Conservative";
	});

	// Attach the tooltips.
	nominateHist.on("postRender", function(c){
		c.svg()
		.selectAll("rect")
		.call(labelTip)
		.on('mouseover', function(d) { if(d.x==memberIdealBucket) { labelTip.attr('class','d3-tip animate').offset([-10,0]).show(d); }}) 
		.on('mouseout', function(d) { labelTip.attr('class','d3-tip').hide(); })
	});

	// Turn off y axis ticks, since they are not meaningful here.
	nominateHist.yAxis().ticks(0);

	// Render the plot
	nominateHist.filter = function() { };
	dc.renderAll();

	// Injecting the legend -- this should probably not be using setTimeout.
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

function loyaltyTable(votes, member, meta)
{
	// Quickly bake an array into a row of data.
	function assembleRow(data) 
	{
		var row = $("<div></div>").addClass("row loyalty");
		var each_width = 12 / data.length;
		for(var i=0; i!= data.length; i++)
		{
			$("<div></div>").addClass("col-sm-" + each_width + " vert").html(data[i]).appendTo(row);
		}
		return row;
	}

	// Clear existing data.
	$("#loyaltyTable").html("");

	// Fill loyalty table
	var headerRow = ["", member["lastName"], 
			"Median " + meta["chamberCap"] + " " + member["noun"],
			meta["chamberCap"] + " Median"];

	var voteRow = ["Votes Cast", member["votes"], 
			getMedian(votes["party"], "votes"), 
			getMedian(votes["chamber"], "votes")];

	var attendanceRow = ["Attendance",
				Math.round(member["attendance"], 1) + "%",
				getMedian(votes["party"], "attendance") + "%",
				getMedian(votes["chamber"], "attendance") + "%"];

	// Assemble
	assembleRow(headerRow).appendTo($("#loyaltyTable"));
	assembleRow(voteRow).appendTo($("#loyaltyTable"));
	assembleRow(attendanceRow).appendTo($("#loyaltyTable"));

	// Only non-independents get party loyalty.
	if(member["party"] != 328)
	{
		var loyaltyRow = ["Party Loyalty",
					Math.round(member["loyalty"], 1) + "%",
					getMedian(votes["party"], "loyalty") + "%",
					getMedian(votes["chamber"], "loyalty") + "%"];

		// Add the tooltip to each cell individually.
		var loyaltyAssembled = assembleRow(loyaltyRow);
		loyaltyAssembled.find("div")
			.attr("data-toggle", "tooltip")
			.attr("data-placement", "bottom")
			.attr("title", "How frequently a member agrees with their party's majority position on a vote, abstentions excluded.")

		loyaltyAssembled
			.appendTo($("#loyaltyTable"));
	}
}
