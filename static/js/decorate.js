var isDoingSelect=0;
var delayUpdateToolip;

/* 
    Add sponsor circle
*/
function addSponsorCircle(oc,dat) {
    var scaleX = d3.scale.linear().domain([-1,1]).range([oc.margins()['left'],oc.width()-oc.margins()['right']]);
    var scaleY = d3.scale.linear().domain([-1,1]).range([oc.height()-oc.margins()['bottom'],oc.margins()['top']]);
    var vc = globalData.rollcalls[0];
    for (var i = 0, len = vc.votes.length; i < len; i++) {
        if (vc.votes[i].icpsr == vc.sponsor) break;
    }
    if (i<len) {
	var ocSVG = d3.select(oc.g()[0][0]), sponsor = vc.votes[i];
	ocSVG.append("circle")
             .attr("stroke",blendColors([sponsor],false))
             .attr("stroke-width","1px")
             .attr("fill","none")
             .attr("r", 9)
             .attr("cx", scaleX(sponsor.x))
             .attr("cy", scaleY(sponsor.y)+1.5); // JBL: Not sure why we need the extra 1.5 here...
    }
}


/*
    Draws the background circles, labels and text for the scatter chart
*/
function decorateNominate(oc,data) {
        var scmargins = oc.margins()
	var width = oc.width();
        var height = oc.height();
	var margin = scmargins['left']-scmargins['right'];
	var marginCircle = scmargins['right']; // Distance of the main circle to the axis
	var tickLength = 15;

	// Calculate ellipse attrs
	var radiusX = (width - margin)/2 - marginCircle;
        var radiusY = nomDWeight*radiusX;
	var circleCenter = { "x": (width + margin)/2, "y": (height - margin)/2 };

	// Select the base SVG
	var ocSVG = d3.select(oc.g()[0][0]);

	// Remove everything that's an axis.
	ocSVG.selectAll(".axis").remove();

	// Place bg stuff in SVG tree in front of .chart-body scatter points
	var svgbg = ocSVG.insert("g",".chart-body");
        var gg = svgbg.append("g").attr("id","scatter-background");

	// X-axis
        var xAxisMin = circleCenter.x - radiusX;
        var xAxisMax = circleCenter.x + radiusX;
        var xAxisLen = xAxisMax - xAxisMin;
        var yDimPos = circleCenter.y + radiusY + 10;

	gg.append('polyline')
		.attr("class", "scatter-axis")
		.attr("points", sprintf("%d,%d %d,%d %d,%d %d,%d",
				xAxisMin, yDimPos + tickLength,
				xAxisMin, yDimPos,
				xAxisMax, yDimPos,
				xAxisMax, yDimPos + tickLength));

	gg.append('text')
            .text("Liberal")
            .attr("x", xAxisMin + 0.02 * xAxisLen)
            .attr("y", yDimPos + 20)
            .attr("style","text-anchor: start; fill: #808080;");
	gg.append('text')
            .text("Conservative")
            .attr("x", xAxisMin + 0.98 * xAxisLen)
            .attr("y", yDimPos + 20)
            .attr("style","text-anchor: end; fill: #808080;");
	gg.append('text')
             .text("DW-Nominate Dimension 1: Economic/Redistributive")
             .attr("x", xAxisMin + xAxisLen/2).attr("y", yDimPos + 20)
             .attr("style","text-anchor:middle");
	// End X axis.

	// Y-axis
        var yAxisMin = circleCenter.y - radiusY;
        var yAxisMax = circleCenter.y + radiusY;
        var yAxisLen = yAxisMax - yAxisMin;

	gg.append('polyline')
	     .attr("class","scatter-axis")
	     .attr("points", sprintf("%d,%d  %d,%d  %d,%d  %d,%d",
	   			     margin, yAxisMin,
				     margin + tickLength, yAxisMin,
				     margin + tickLength, yAxisMax,
				     margin, yAxisMax));
	gg.append('text')
	     .text("Conservative")
	     .attr("x", 50)
             .attr("y", yAxisMin + 0.05 * yAxisLen)
             .attr("style","text-anchor: end; fill: #808080;")
             .attr("transform", sprintf("rotate(-90 50 %d)", yAxisMin + 0.05 * yAxisLen));
	gg.append('text')
             .text("Liberal")
	     .attr("x", 50)
             .attr("y", yAxisMin + 0.95 * yAxisLen)
             .attr("style","text-anchor: start; fill: #808080;")
             .attr("transform", sprintf("rotate(-90 50 %d)", yAxisMin + 0.95 * yAxisLen));

	var seconddim_label = "NOMINATE Dimension 2: Other Votes";
	if(congressNum != null)
	{
		switch(true) {
			case (congressNum <= 24):
				break;
			case (congressNum <= 32):
				seconddim_label = "NOMINATE Dimension 2: Slavery / Racial";
				break;
			default:
				break;
		}
	}

	gg.append('text')
             .text(seconddim_label)
             .attr("x", 30)
             .attr("y", yAxisMin + yAxisLen/2)
             .attr("style","text-anchor:middle")
             .attr("transform", sprintf("rotate(-90 30 %d)", yAxisMin + yAxisLen/2));
	// End Y axis

	// Add yea and nay locations to the plot on top of the dots
	// Problem is that with Y/N on top we can't select point under/near the Y/N
	// Need a way to insert after the dots but before the brush. Putting the Y/N group right
	// before the brush group does it. --JBL

	var ggg = ocSVG.insert("g",".brush");

        var hasNominate = 1;
        if (data.rollcalls == undefined || data.rollcalls[0].nominate == undefined || data.rollcalls[0].nominate.spread == undefined)
        {
                console.log("Vote type 1: Missing critical data / rollcalls, nominate, or spread.");
                hasNominate=0;
                gg
			.append("ellipse")
                        .attr("stroke","black")
                        .attr("stroke-width","1px")
                        .attr("fill","none")
			.attr("rx", radiusX)
                        .attr("ry", radiusY)
			.attr("cx", circleCenter.x)
			.attr("cy", circleCenter.y);
		var voteShare=0;
        }
        else
        {
            if(data.rollcalls[0].congress==0) var vn = data.rollcalls[0].nominate.imputed;
            else var vn = data.rollcalls[0].nominate;
            var voteShare = Math.max(data.rollcalls[0].yea, data.rollcalls[0].nay)/(data.rollcalls[0].yea+data.rollcalls[0].nay);
        }


	// Fit box regardless if cutline exists
	if(vn != undefined && vn.pre != undefined && vn.pre != "")
	{
		ggg.append('text').text(sprintf("Proportionate Reduction in Error (PRE): %4.2f", (vn.pre == null || isNaN(vn.pre) || vn.pre=="") ? 0 : vn.pre))
		    .attr("class", "fitbox")
		    .attr("x", xAxisMin + 0.98 * xAxisLen)
	            .attr("style","text-anchor: end;")
		    .attr("y", yDimPos + 40);
		ggg.append('text').text(sprintf("Proportion of votes correctly classified: %4.2f", (vn.classified == null || isNaN(vn.classified) || vn.classified=="") ? 0 : vn.classified ))
		    .attr("class", "fitbox")
		    .attr("x", xAxisMin + 0.02 * xAxisLen)
		    .attr("y", yDimPos + 40);
	}

	var legendType=1;


	var doHM = 1;

	if (hasNominate && (vn.spread[0]!=0 | vn.spread[1]!=0) && (voteShare<=0.975 | data.rollcalls[0].nominate.pre > 0) ) { // Only drawn if there is a cutline!
		console.log("Vote type 2: Has actual division");
		var hmTranslate = {x: scmargins['left'], y: (oc.height()/2) - radiusY - scmargins['top']};
		var gggg = gg.append("g")
				.attr("id","heat-map")
				.attr("transform","translate(" + hmTranslate.x + "," + hmTranslate.y+ ")");

		nominateHeatmap(gggg, vn.mid[0], vn.mid[1], vn.spread[0], vn.spread[1],
			nomBeta, nomDWeight, 2 * radiusX, 2 * radiusY, 30, ["#FFFFFF","#FFFFAA"]);

	       // Calculate where the YN text axis goes.
	       function closestpt(vn) {
		    var b = vn.slope;
                    var angle = Math.atan( (vn.spread[1] * nomDWeight) / (vn.spread[0]) );
		    var a = vn.mid[1] - b * vn.mid[0];
		    var xstar = -b * a / (1 + b * b);
		    var obj = {
			angle: angle,
			b: b,
			a: a,
		        xstar: xstar,
			ystar: b * xstar + a,
			offsetX: 0.05 * Math.cos(angle) * Math.sign(vn.spread[0]),
			offsetY: (vn.slope > 0 ? 1 : -1) * 0.05 * Math.sin(angle) * Math.sign(vn.spread[1]) / nomDWeight
		    }
		    return(obj);
		}
	        
                var ynp = closestpt(vn);

 		var ynpts =    [circleCenter.x + radiusX*(ynp.xstar+ynp.offsetX),
				circleCenter.y - radiusY*(ynp.ystar-ynp.offsetY),
				circleCenter.x + radiusX*(ynp.xstar-ynp.offsetX),
				circleCenter.y - radiusY*(ynp.ystar+ynp.offsetY)];

	        var angle = 57.29578*ynp.angle;

		// This is a hack based on what quadrant the text angle is in.
		var cs = (angle>0?1:0) + 2*(vn.spread[0]>0?1:0);
		switch(cs)
		{
			case 0: angle = 90-angle; break;
			case 1: angle = 90-angle; break;
			case 2: angle = 270-angle; break;
			case 3: angle = -90-angle; break;
		}

		// Plot the Y text using ynpts[2], [3] and rotating by the angle above.
		ggg.append('text').text('Y')
			.attr("class","yeanay")
			.attr("x", ynpts[2])
			.attr("y", ynpts[3])
			.attr("transform",sprintf("rotate(%d %d %d)", angle, ynpts[2], ynpts[3]));

		// Plot the N text using ynpts[0], [1], and rotating by the angle above + 180
		ggg.append('text').text('N')
			.attr("class","yeanay")
			.attr("x", ynpts[0])
			.attr("y", ynpts[1])
			.attr("transform",sprintf("rotate(%d %d %d)", 180+angle, ynpts[0], ynpts[1]));

	}
	else
        {
		if(data.rollcalls != undefined)
		{
		        var nomData = data.rollcalls[0].nominate;
			if(nomData != undefined && nomData.intercept != undefined && nomData.pre === "")
			{
				console.log("Vote type 3: PRE is undefined but NOMINATE was estimated.");
				// This is actually the case where NOMINATE is estimated but the PRE/probability stuff is not.
			        ggg.append('text').text("NOMINATE not")
					.attr("class","fitbox").attr("x", xAxisMax - 110)
					.attr("y", yAxisMax - 12);
				ggg.append('text').text("yet estimated")
					.attr("class","fitbox").attr("x", xAxisMax - 110)
					.attr("y", yAxisMax - 0);
				doHM = 0;
			}
			else if(nomData != undefined && nomData.spread != undefined)
			{
				console.log("Vote type 4: Lopsided vote.");
				ggg.append('text').text("Lopsided vote with")
					.attr("class","fitbox").attr("x", xAxisMax - 110)
					.attr("y", yAxisMax - 12);
				ggg.append('text').text("no ideological division")
					.attr("class","fitbox").attr("x", xAxisMax - 110)
					.attr("y", yAxisMax - 0);
				var legendType=2;
			}
			else
		        {
				console.log("Vote type 5: NOMINATE actually not estimated.");
			        ggg.append('text').text("NOMINATE not")
					.attr("class","fitbox").attr("x", xAxisMax - 110)
					.attr("y", yAxisMax - 12);
				ggg.append('text').text("yet estimated")
					.attr("class","fitbox").attr("x", xAxisMax - 110)
					.attr("y", yAxisMax - 0);
				var legendType=3;
			}


			if(doHM)
			{
		 	        var hmTranslate = {x: scmargins['left'], y: (oc.height() / 2) - radiusY - scmargins['top']};
	                	var gggg = gg.append("g")
	                          	.attr("id", "heat-map")
	                          	.attr("transform", "translate(" + hmTranslate.x + "," + hmTranslate.y + ")");

		        	var pctYea = globalData.rollcalls[0].yea_count / (globalData.rollcalls[0].yea_count + globalData.rollcalls[0].nay_count);
	   	        	lopsidedHeatmap(gggg, nomDWeight, 2*radiusX, 2*radiusY, ["#FFFFFF","#ffffcc"], pctYea);
			}
		}
	}

        // Tooltip for Prob(yea)
        if (hasNominate==1 && doHM) { //Show it as long as nominate has been fit

            // Collecting info to find vote prob for heat map
	    if(!$("#hm_tooltip").length) // Make sure we don't already have a tooltip
	    {
		$("<div></div>")
			.attr("id","hm_tooltip")
			.addClass("d3-tip")
			.addClass("heatmapTip")
			.appendTo(document.body);
	    }
            var yunits = radiusY;
	    var xunits = radiusX;
            var brush = ocSVG.select(".brush");
	    brush.on("mouseover",function() { if(!isDoingSelect) { $("#hm_tooltip").css("visibility","visible"); }});
            brush.on("mousemove",function() {
			var ypdiv = $("#hm_tooltip");
                        var cx = circleCenter.x-hmTranslate.x,
                            cy = circleCenter.y-hmTranslate.y,
                            x  =  (d3.mouse(this)[0] - cx)/xunits,
                            y  = -(d3.mouse(this)[1] - cy)/yunits;
		        if (vn.spread[0]!=0 & vn.spread[1]!=0) {
		            // Votes with cutlines...
			    var yeaProb = nomProbYea(x,y,vn.mid[0],vn.mid[1],vn.spread[0],
                                                 vn.spread[1],nomDWeight,nomBeta);
			} else {
			    // Lopsided vote case...
			    var yeaProb = data.rollcalls[0].yea_count/(data.rollcalls[0].yea_count+data.rollcalls[0].nay_count);
			}
	                    if ((x*x+y*y)<1.0) {
                                if(yeaProb>0.99) {
        		           dispProb = " > 0.99"
                                } else if(yeaProb<0.01) {
                                   dispProb = " < 0.01"
                                } else {
                                   dispProb = Math.round(100*yeaProb)/100;
                                }
				if(!isDoingSelect) ypdiv.css("visibility","visible");
				ypdiv.html("<strong>Probability of Voting Yea: </strong>" + dispProb + "<br/> The calculated probability that a member at this position would vote 'Yea' on the rollcall.")
				   .css("left",d3.event.pageX + 20 + "px")
				   .css("top",(d3.event.pageY - 48) + "px");
			    }
			    else
			    {
 				// Cursor is on nominate plot, but not in the Oval
				ypdiv.css("visibility","hidden");
			    }

                      });
            // Don't show tooltip if user is making a range selection
            brush.on("mousedown",function() { $("#hm_tooltip").css("visibility","hidden"); isDoingSelect=1; });
            brush.on("mouseup",function() { $("#hm_tooltip").css("visibility","visible"); isDoingSelect=0; });
	    brush.on("mouseout", function() { $("#hm_tooltip").css("visibility","hidden"); });
	};
}

