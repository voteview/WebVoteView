$("#congSelector").change(reloadIdeology);

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

function reloadIdeology()
{
	congressNum = $("#congSelector").val();
	queue().defer(d3.json, "/api/getmembersbycongress?congress="+congressNum).await(drawHistWrap);
}

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
			memberIdeal = d.nominate.oneDimNominate;
			memberPartyName = d.partyname;
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

	var label = "<strong>Ideology Score:</strong> "+memberIdeal+" <em>(NOMINATE first dimension)</em><br/><br/>";
	if(Math.floor(100*ctGreater/(ctTotal-1),1)>50)
	{
		if(Math.floor(100*ctGreater/(ctTotal-1),1)==100)
		{
			label += "The most liberal member of the "+getGetOrdinal(congressNum)+" Congress.";
		}
		else
		{
			label += "More liberal than "+Math.floor(100*ctGreater/(ctTotal-1),1)+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>";
			label += "More liberal than "+Math.floor(100*ctPartyGreater/(ctPartyTotal-1),1)+"% of "+memberPartyName+"s in the "+getGetOrdinal(congressNum)+" Congress.";
		}
		
	}
	else
	{
		if(Math.ceil(100*ctGreater/(ctTotal-1),1)==0)
		{
			label += "The most conservative member of the "+getGetOrdinal(congressNum)+" Congress.";
		}
		else
		{
			label += "More conservative than "+(100-Math.ceil(100*ctGreater/(ctTotal-1),1))+"% of the "+getGetOrdinal(congressNum)+" Congress.<br/>More conservative than "+(100-Math.ceil(100*ctPartyGreater/(ctPartyTotal-1),1))+"% of co-partisans in the "+getGetOrdinal(congressNum)+" Congress.";
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
		.on('mouseover', function(d) { if(d.x==memberIdealBucket) { labelTip.attr('class','d3-tip animate').offset([-10,0]).show(d); }}) 
		.on('mouseout', function(d) { labelTip.attr('class','d3-tip').hide(); })
	});

	nominateHist.yAxis().ticks(0);

	nominateHist.filter = function() { };

	dc.renderAll();
}
