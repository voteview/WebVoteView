$("#congSelector").change(reloadIdeology);

(function loadData()
{
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum+"&api=Web_PI").await(drawLoyaltyHist);	
})();

function getMedian(a, t) {

    var middlePos = Math.floor((a.length - 1) / 2);
    
    if (t == 'votes') {
	var sortedA = a.sort(function(a, b) {return a[0] - b[0];});
    } else {
	var sortedA = a.sort(function(a, b) {return a[1]/a[0] - b[1]/b[0];});
    }
   
    if (sortedA.length % 2) {
	if (t == 'votes') {
	    return sortedA[middlePos][0];
	} else {
	    return Math.round(100 * (1 - sortedA[middlePos][1] / sortedA[middlePos][0]), 1);
	}
    } else {
	if (t == 'votes') {
	    return (sortedA[middlePos][0] + a[middlePos + 1][0]) / 2.0;
	} else {
	    middleA = [(sortedA[middlePos][0] + a[middlePos + 1][0]) / 2.0,
		       (sortedA[middlePos][1] + a[middlePos + 1][1]) / 2.0];
	    return Math.round(100 * (1 - middleA[1] / middleA[0]), 1);
	}   
    }
}

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
    queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum+"&api=Web_PI").await(updateCongress);
}

// Wrapper to update default loadings for the person's ideal point.
function updateCongress(error, data)
{
	// Fail if we didn't get data.
	if(data==undefined) { return(0); }
	// Loop until you find the person.
	var foundRep = 0;
	data["results"].forEach(function(d) {
		if(!foundRep && d.icpsr==memberICPSR)
		{
			console.log(d);
			memberIdeal = d.nominate.dim1;
			memberPartyCode = d.party_code;
			memberNoun = d.party_noun;
			partyColor = d.party_color;
		    chamber = d.chamber.toLowerCase();
		    memberVotes = d.nvotes_yea_nay;
//		    memberAttendance = 100 * (1 - d.nvotes_yea_nay / 
		        memberLoyalty = 100 * (1 - d.nvotes_against_party / d.nvotes_yea_nay);
    		 	$("#partyname").html("<a href=\"/parties/"+d.party_code+"\">"+memberNoun+"</a>");
			if(d.district_code != undefined && d.district_code!=0 && d.district_code!=98 && d.district_code!=99)
			{
				$("#district_label").html(getGetOrdinal(d.district_code)+" congressional district");
				$("#show_district").css("display","block");
			}
			else $("#show_district").css("display","none");
			memberIdealBucket = Math.floor(memberIdeal*numBins);
			console.log(memberIdealBucket);
			foundRep=1;
			return false;
		}
		return false;
	});

	$("#congSelector").blur();

    drawLoyaltyHist(error, data);
}

function drawLoyaltyHist(error, data)
{
	// Now call the actual plotting function.
	fillLoyaltyDrawHist(error, data);    
}

function fillLoyaltyDrawHist(error, data)
{
	if(data==undefined)
	{
		return(0);
	}

        var ctGreater=0;
	var ctTotal=0;
	var ctPartyGreater=0;
        var ctPartyTotal=0;
        var partyVotes=[];
        var chamberVotes=[];
	var oneDims = [];
	data["results"].forEach(function (d) {
		if(d.nominate==undefined) { return true; }
	    oneDims.push(d.nominate.dim1);
	    chamberVotes.push([d.nvotes_yea_nay, d.nvotes_against_party]);
		ctTotal+=1;
		if(d.nominate.dim1>memberIdeal) 
		{ 
			ctGreater+=1; 
		}
		if(d.party_code==memberPartyCode)
	       {
                   partyVotes.push([d.nvotes_yea_nay, d.nvotes_against_party]);
			ctPartyTotal+=1;
			if(d.nominate.dim1>memberIdeal) 
			{
				ctPartyGreater+=1; 
			}
	       }
	    
	});

    // Fill loyalty table
    var medianPartyVotes = getMedian(partyVotes, 'votes');
    var medianChamberVotes = getMedian(chamberVotes, 'votes');
    var medianPartyLoyalty = getMedian(partyVotes, 'loyalty');
    var medianChamberLoyalty = getMedian(chamberVotes, 'loyalty');

    var headerRow = '<div class="row loyalty"><div class="col-sm-3 vert"></div><div class="col-sm-3 vert">' + memberLastName + '</div>' + 
	'<div class="col-sm-3 vert">Median ' + memberNoun + '</div>' +
	'<div class="col-sm-3 vert">Median in ' + chamber.substring(0, 1).toUpperCase() + chamber.substring(1) + '</div></div>';
    var voteRow  ='<div class="row loyalty"><div class="col-sm-3 vert">Votes Cast</div><div class="col-sm-3 vert">' + memberVotes + '</div>' + 
	'<div class="col-sm-3 vert">' + medianPartyVotes + '</div>' +
	'<div class="col-sm-3 vert">' + medianChamberVotes + '</div></div>';
    var loyaltyRow  ='<div class="row loyalty"><div class="col-sm-3 vert">Party Loyalty</div><div class="col-sm-3 vert">' + Math.round(memberLoyalty, 1) + '%</div>' + 
	'<div class="col-sm-3 vert">' + medianPartyLoyalty + '%</div>' +
	'<div class="col-sm-3 vert">' + medianChamberLoyalty + '%</div></div>';
    $('#loyaltyTable').html(headerRow + voteRow + loyaltyRow);

    // Draw ideology histogram
	var label = "<strong>Ideology Score:</strong> "+memberIdeal+" <em>(DW-NOMINATE first dimension)</em><br/><br/>";
	var libPercentage = Math.floor(100*ctGreater/(ctTotal-1),1);
	var libPartyPercentage = Math.round(100*ctPartyGreater/(ctPartyTotal-1),1);
	if(libPercentage==100 && ctPartyGreater==ctPartyTotal-1) { label += "The most liberal member of the "+getGetOrdinal(congressNum)+" Congress."; }
	else if(libPercentage==0 && ctPartyGreater==0) { label += "The most conservative member of the "+getGetOrdinal(congressNum)+" Congress."; }
	else
	{
		if(libPercentage>50) { label += "More liberal than "+libPercentage+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>"; }
		else { 	label += "More conservative than "+(100-libPercentage)+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>"; }

		if(ctPartyTotal>1)
		{
			if(libPartyPercentage==100) { label += "The most liberal "+memberNoun+" of the "+getGetOrdinal(congressNum)+" Congress."; }
			else if(libPartyPercentage==0) { label += "The most conservative "+memberNoun+" of the "+getGetOrdinal(congressNum)+" Congress."; }
			else if(libPartyPercentage>50) { label += "More liberal than "+libPartyPercentage+"% of "+memberNoun+"s in the "+getGetOrdinal(congressNum)+" Congress."; }
			else { label += "More conservative than "+(100-libPartyPercentage)+"% of "+memberNoun+"s in the "+getGetOrdinal(congressNum)+" Congress."; }
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
	var oneDimGroup = oneDimDimension.group(function(d) { return Math.floor(d*numBins); });

	var nominateHist = dc.barChart("#nominateHist");
	nominateHist.width(420).height(130).margins({top: 10, right:10, bottom: 30, left:20})
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

