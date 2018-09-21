
// Functions for calculating NOMINATE Pr(Yea)

// cdf and erf from http://stackoverflow.com/questions/14846767/std-normal-cdf-normal-cdf-or-error-function
function cdf(x,mean,variance) {
    return 0.5 * (1 + erf((x - mean) / (Math.sqrt(2 * variance))));
}

function erf(x) {
    var sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);

    // constants
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var p  =  0.3275911;

    // A&S formula 7.1.26
    var t = 1.0/(1.0 + p*x);
    var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y; // erf(-x) = -erf(x);
}

function nomProbYea(x1,x2,m1,m2,s1,s2,w,b) {
    var Uy = b*( Math.exp( -Math.pow(x1-m1+s1,2) - w*w*Math.pow(x2-m2+s2,2)));
    var Un = b*( Math.exp( -Math.pow(x1-m1-s1,2) - w*w*Math.pow(x2-m2-s2,2)));
    return( cdf( Uy-Un, 0.0, 1.0) );
}

// The heatmap is lopsided yes or no. 
function lopsidedHeatmap(svg,w,width,height,colorRamp,pctYea) {
    // If it's lopsided nay, we don't need to add any colour.
    if(pctYea < 0.05) return;

    var nominateScale = {x: d3.scale.linear().domain([-1,1]).range([0,width]) ,
			 y: d3.scale.linear().domain([-1,1]).range([height,0]) };
    var nominateScaleR = {x: d3.scale.linear().range([-1,1]).domain([0,width]) ,
                          y: d3.scale.linear().range([1,-1]).domain([0,height]) };
    var colorScale = d3.scale.linear()
	.domain([0,1])
	.range(colorRamp);
    svg.append("ellipse")
        .attr("stroke","grey")
        .attr("cx", nominateScale.x(0))
        .attr("cy", nominateScale.y(0))
        .attr("rx", nominateScale.x(1)/2)
        .attr("ry", nominateScale.y(-1)/2)
        .attr("fill",colorScale(pctYea));
}

// Drawing the hex heatmap.
function nominateHeatmap(svg,m1,m2,s1,s2,b,w,width,height,cells,colorRamp) {
    // Precompute sqrt(3) for hex drawing
    var SQRT3 = Math.sqrt(3);

    // Getting scales so that we can translate NOMINATE coordinates to real coordinates.
    var nominateScale = {x: d3.scale.linear().domain([-1,1]).range([0,width]) ,
			 y: d3.scale.linear().domain([-1,1]).range([height,0]) };

    // Or when it's reversed
    var nominateScaleR = {x: d3.scale.linear().range([-1,1]).domain([0,width]) ,
                          y: d3.scale.linear().range([1,-1]).domain([0,height]) };

    // And the colour ramp from white to off-yellow.   
    var colorScale = d3.scale.linear()
	.domain([0,1])
	.range(colorRamp);

    //Calculate the center positions of each hexagon	
    var points = [];
    var odd = true;
    var x1unit = 2.0/cells * SQRT3;
    var x2unit = 2.0/cells ;

    console.log("Precomputing heat map hexes.");
    // Looping through and getting the colour for each map hex.
    for (var x2 = -1 - x2unit; x2 <= 1 + x2unit; x2 += x2unit * 3/4/w) {
	var offset = odd ? 0 : x1unit/4.0; 
	for (var x1 = offset; x1 <= Math.sqrt(1+2.2*x1unit-x2*x2); x1+=x1unit/2) {
	    points.push({x:nominateScale.x( x1), y:nominateScale.y(x2), p:nomProbYea( x1,x2,m1,m2,s1,s2,w,b)});
	    points.push({x:nominateScale.x(-x1), y:nominateScale.y(x2), p:nomProbYea(-x1,x2,m1,m2,s1,s2,w,b)});
	}
	odd = !odd;
    }

    // Prune the extreme hexes we do not need to draw.
    console.log("Original hexes: " + points.length);
    points = $.grep(points, function(p) { return(p.p>0.05 && p.p < 0.95 ); });
    console.log("Post-pruning hexes: " + points.length);

    //Set the hexagon radius
    var hexRadius = width/cells/2.0 + 1;
    var hexagonPoly=[[0,-1/w],[SQRT3/2,0.5/w],[0,1/w],[-SQRT3/2,0.5/w],[-SQRT3/2,-0.5/w],[0,-1/w],[SQRT3/2,-0.5/w]];

    // Actually put all the polygons in.
    var hexagonPath = "m" + hexagonPoly.map(function(p){return [p[0]*hexRadius, p[1]*hexRadius*w].join(",")}).join("l") + "z";

    // Clipping path.
    svg.append("clipPath")
	.attr("id", "ellipse-clip") 
	.append("ellipse")
	.attr("cx", nominateScale.x(0))
	.attr("cy", nominateScale.y(0))
	.attr("rx", nominateScale.x(1)/2)
	.attr("ry", nominateScale.y(-1)/2);

    // Add cutline
    var b_slope = -s1/(s2*w*w + 0.0005);
    var a = m2 - b_slope *m1;

    // Next, shade the Yea side of the ellipse yellow so we don't need to draw the Pr(Yea) > 0.95 respondents.

    // Calculating points that line intercepts circle
    function intercept_circle(a, b, r) 
    {
	    // y = bx + a, and x^2 + y^2 = r^2
	    // Substitute: x^2 + (bx + a)^2 - r^2 = 0
	    // (b^2 + 1) x^2 + 2abx + a^2 - r^2 = 0
	    // Quadratic formula components:
	    var qA = (b**2) + 1;
	    var qB = 2 * a * b;
	    var qC = (a**2) - (r**2);
	    // Solve quadratic formula
	    var quad_low = (-qB + Math.sqrt(qB**2 - 4*qA*qC)) / (2*qA);
	    var quad_high = (-qB - Math.sqrt(qB**2 - 4*qA*qC)) / (2*qA);
	    var x1 = Math.max(quad_low, quad_high);
	    var x2 = Math.min(quad_low, quad_high);
	    return {"x1": x1, "y1": b * x1 + a, "x2": x2, "y2": b * x2 + a};
    }

    // Translate quad formula solutions into coordinate pairs -- we are always drawing the cutline LEFT
    var line_clip = intercept_circle(a, b_slope, 1);

    // Get ellipse radius in real units.
    var radius_x = nominateScale.x(1) / 2;
    var radius_y = nominateScale.y(-1) / 2;

    // Test a point above the midpoint, and a point below the midpoint, see which is the side that needs shading.
    var new_y = (1 - (m1**2));
    var shade_up = (nomProbYea(m1, 1, m1, m2, s1, s2, w, b) > nomProbYea(m1, -1, m1, m2, s1, s2, w, b)) ? 1 : 0;

    // Check to see if the arc above the line is the major arc
    var up_major = (a < 0) ? 1 : 0;

    // Do we draw the large arc or the small arc?
    var large_arc = (shade_up == up_major) ? 1 : 0;

    // Do we use the sweep flag (clockwise or counterclockwise). All lines are moving left, so 
    // SF = 1 when we are shading up.
    var sweep_flag = shade_up;

    // Here is the yellow field polygon
    var arc_text = " A " + radius_x + ", " + radius_y + ", 0, " + large_arc + ", " + sweep_flag + ", " + nominateScale.x(line_clip["x1"]) + ", " + nominateScale.y(line_clip["y1"]);
    svg.append("path")
	.attr("d", "M" + nominateScale.x(line_clip["x1"]) + "," + nominateScale.y(line_clip["y1"]) + 
		   " L " + nominateScale.x(line_clip["x2"]) + "," + nominateScale.y(line_clip["y2"]) + 
		   arc_text)
	.attr("stroke-width", "0px")
	.style("fill", colorRamp[1]);

    // Start drawing the hexagons on top of the yellow field.
    svg.append("g")
	.selectAll(".hexagon")
	.data( points )
	.enter().append("path")
	.attr("class", "hexagon")
	.attr("d", function (d) {
		return "M" + d.x + "," + d.y + hexagonPath;; })
	.attr("clip-path", "url(#ellipse-clip)")
	.attr("stroke-width", "0px")
	.style("fill", function (d,i) {
	       return colorScale(d.p);
	});

    // Draw the whole ellipse again?
    svg.append("ellipse").attr("cx", nominateScale.x(0))
	.attr("cy", nominateScale.y(0))
                    .attr("rx", nominateScale.x(1)/2)
                    .attr("ry", nominateScale.y(-1)/2)
                    .attr("fill","none")
                    .attr("stroke","gray").attr("stroke-width","1px");


    // Draw cutline
    svg.append("line")
	.attr("x1",nominateScale.x(line_clip["x1"]))
	.attr("x2",nominateScale.x(line_clip["x2"]))
	.attr("y1",nominateScale.y(line_clip["y1"]))
	.attr("y2",nominateScale.y(line_clip["y2"]))
	.attr("stroke","black")
	.attr("stroke-width",2);
}




function nominateHeatkey(key,h,colors) {
    var w = 80;
    key.attr("width", w).attr("height", h*1.1);
    var legend = key.append("defs").append("svg:linearGradient").attr("id", "gradient").attr("x1", "100%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%").attr("spreadMethod", "pad");
    legend.append("stop").attr("offset", "0%").attr("stop-color", colors[1]).attr("stop-opacity", 1);
    legend.append("stop").attr("offset", "100%").attr("stop-color", colors[0]).attr("stop-opacity", 1);
    key.append("rect").attr("width", 0.2*w).attr("height", h*0.97).style("stroke","#CCCCCC").style("fill", "url(#gradient)").attr("transform", "translate(0,10)");
    var y = d3.scale.linear().range([h*0.97, 0]).domain([0, 100]);
    var yAxis = d3.svg.axis().scale(y).orient("right");
    key.append("g").attr("class", "y hm_axis").attr("transform", "translate(25,10)").call(yAxis).append("text").attr("transform", "rotate(-90)").attr("y", 30).attr("dy", ".71em").style("text-anchor", "end").text("Probability of Yea Vote");

    key.append("line")
	.attr("x1",0)
	.attr("x2",0.2*w)
	.attr("y1",y(45))
	.attr("y2",y(45))
	.attr("stroke-width","0px")
	.attr("stroke","black")
	.attr("id","hm_prob_lev_line");
}


// TESTING


// var margin = {
//	top: 10,
//	right: 10,
//	bottom: 10,
//	left: 10
//};

//var w = 0.41;
//var width=600;
//var height=width*w;
//var colorRamp = ["#FFFFFF","#FFFF8E"];

//var svg = d3.select("#heat_map").append("svg")
//	.attr("width", width + margin.left + margin.right)
//	.attr("height", height + margin.top + margin.bottom)
//	.append("g")
//	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

//var leg = d3.select("#hm_legend").append("svg").attr("align","right")

//nominateHeatkey(leg,h=height*0.66,colorRamp);
//nominateHeatmap(svg, 0.5, 0.0, 0.3, 0.0, 7.1, w, width, cells=40, colorRamp=colorRamp);
