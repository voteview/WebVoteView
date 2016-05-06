if (!Modernizr.inlinesvg) {
    d3.select(".ieWarning")
	.style("display", "block");
}

var marginBars = {top: 0, right: 15, bottom: 32, left: 30};

var widthBars = 940 - marginBars.left - marginBars.right,
    heightBars = 230 - marginBars.top - marginBars.bottom;

var svgBars = d3.select("#bars")
    .attr("width", widthBars + marginBars.left + marginBars.right)
    .attr("height", heightBars + marginBars.top + marginBars.bottom)
    .append("g")
    .attr("transform", "translate(" + marginBars.left + "," + marginBars.top + ")");

var widthMap = 960,
    heightMap = 575;

var quantize = d3.scale.quantize()
    .domain([1, 87])
    .range(d3.range(9).map(function(i) { return i + "-9"; }));

var projection = d3.geo.albersUsa()
    .scale(1200)
    .translate([widthMap / 2, heightMap / 2]);

var path = d3.geo.path()
    .projection(projection);

var svgMap = d3.select("#map");

var colorAll = d3.scale.threshold()
    .domain([15, 30, 45, 60, 75])
    .range(["#ede7ef", "#ded0e0", "#bda3c2", "#9d74a4", "#7b4685", "#5b1967"]);

var colorDem = d3.scale.threshold()
    .domain([15, 30, 45, 60, 75])
    .range(["#e6e8f0", "#ced0e1", "#9fa5c5", "#6f79a9", "#3f4b8b", "#11216f"]);

var colorGop = d3.scale.threshold()
    .domain([15, 30, 45, 60, 75])
    .range(["#f1e3e3", "#e7cbc9", "#cf9695", "#b76361", "#9f2f2c", "#730f0d"]);

var filter = "district";

queue()
    .defer(d3.csv, "data/barsdata.csv")
    .defer(d3.json, "json/us-congress-113.json")
    .defer(d3.csv, "data/hispanic.csv")
    .await(drawPage);



function drawPage(error, barData, us, hispanic) {
    var x = d3.scale.ordinal()
	.domain(d3.range(1, 88))
	.rangeRoundBands([0, widthBars], 0.1);
  
    var y = d3.scale.linear()
	.domain([0, d3.max(barData, function(d) { return +d.total; })])
	.range([heightBars, 0]);

    var yAxis = d3.svg.axis()
	.scale(y)
	.orient("left")
	.ticks(5)
	.tickSize(-widthBars, 0, 0);
  
    var xAxis = d3.svg.axis()
	.scale(x)
	.orient("bottom")
	.tickFormat(function(d) { return d + "%" })
	.tickValues([1, 15, 30, 45, 60, 75]);

    svgBars.append("g")
	.attr("class", "y axis")
	.call(yAxis)
	.append("text")
	.attr("transform", "rotate(-90)")
	.attr("y", 0)
	.attr("x", -heightBars / 2)
	.attr("dy", "-23px")
	.style("text-anchor", "middle")
	.style("fill", "#999")
	.text("Number of districts");

    svgBars.append("g")
	.attr("class", "x axis")
	.attr("transform", "translate(0," + heightBars + ")")
	.call(xAxis)
	.append("text")
	.attr("x", widthBars / 2)
	.attr("dy", "30px")
	.style("text-anchor", "middle")
	.style("fill", "#999")
	.text("Percentage of district residents who are Hispanic");

    var rect = svgBars.selectAll("rect")
	.data(barData).enter()
	.append("rect")
	.attr("x", function(d, i) { return x(i); })
	.attr("y", function(d) { return heightBars; })
	.attr("height", 0)
	.attr("width", x.rangeBand())
	.on("mouseover", function(d, i) {
		d3.select(this).classed("selected", true);
		d3.selectAll(".h" + d.percentile + "." + filter).classed("selected", true);
	    })
	.on("mouseout", function(d) {
		d3.select(this).classed("selected", false);
		polygons.classed("selected", false);
	    });

    updateBars("total");


    function updateBars(series) {
	rect.transition().duration(500)
	    .attr("y", function(d) { return y(d[series]); })
	    .attr("height", function(d) { return heightBars - y(d[series]); })
	    .attr("fill", function(d, i) {
		    switch(series) {
		    case "total" : return colorAll(i);
		    case "rDistricts" : return colorGop(i);
		    case "dDistricts" : return colorDem(i);
		    }
		});
    };



    d3.select("#loading").remove();


    var rateById = {},
	partyById = {},
	    nameById = {},
		districtNameById = {};

		hispanic.forEach(function(d) { rateById[d.id] = d.hispanic });
		hispanic.forEach(function(d) { partyById[d.id] = d.party });
		hispanic.forEach(function(d) { nameById[d.id] = d.fullName });
		hispanic.forEach(function(d) { districtNameById[d.id] = d.districtName });

		var zoom = d3.behavior.zoom()
		    .scaleExtent([1, 6])
		    .on("zoom", zoomed);

		var features = svgMap.append("g");

		var tooltip = d3.select("#mapTooltip");

		var polygons = features.selectAll("path")
		    .data(topojson.feature(us, us.objects.districts).features)
		    .enter()
		    .append("path")
		    .attr("class", function(d) { return "district h" + rateById[d.id] + " " + partyById[d.id]; })
		    .style("stroke-width", ".5px")
		    .attr("fill", function(d) { return colorAll(rateById[d.id]); })
		    .attr("d", path)
		    .on("mouseover", function(d) {
			    d3.select(this).classed("selected", true);
          tooltip
			    .html('<h5>' + districtNameById[d.id] + '</h5> '+ '<p class="tooltipName">' + nameById[d.id] + '</p>' + '<p class="tooltipRate">' + rateById[d.id] + '% Hispanic')
			    .style("top", function() { return d3.mouse(document.getElementById("contentArea"))[1] + 30 + "px"} )
			    .style("left", function() { return d3.mouse(document.getElementById("contentArea"))[0] + 10 + "px"})
			    .style("display", "block");
			})
		    .on("mouseout", function() {
			    d3.select(this).classed("selected", false);
			    tooltip.style("display", "none");
			})

		    svgMap.call(zoom); 
    
		features.append("path")
		    .datum(topojson.mesh(us, us.objects.districts, function(a, b) { return a !== b && !(a.id / 1000 ^ b.id / 1000); }))
		    .attr("class", "district-border")
		    .style("stroke-width", ".75px")
		    .attr("d", path);

		features.append("path")
		    .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
		    .attr("class", "state-border")
		    .style("stroke-width", "1.75px")
		    .attr("d", path);

		features.selectAll(".stateLabel")
		    .data(topojson.feature(us, us.objects.states).features)
		    .enter()
		    .append("text")
		    .attr("class", function(d) { return "stateLabel " + d.properties.APname; } )
		    .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
		    .attr("dy", ".35em")
		    .text(function(d) { if (d.properties.APname !== "D.C.") { return d.properties.APname; }});

		features.selectAll(".districtLabel")
		    .data(topojson.feature(us, us.objects.districts).features)
		    .enter()
		    .append("text")
		    .attr("class", function(d) { return "districtLabel " + d.properties.number; } )
		    .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
		    // .attr("dy", ".35em")
		    .style("opacity", 0)
		    .text(function(d) { 
			    if (+d.properties.number == 0) { return "At large"; }
			    else { return +d.properties.number; }  
			});


		d3.select(".homeBtn").on("click", function() {
			tooltip.style("display", "none");
			zoom.scale(1);
			zoom.translate([0, 0]);
			features.transition().duration(500).attr('transform', 'translate([0,0]) scale(1)')
			    .select(".state-border").style("stroke-width", "1.75px");
			features.select(".district-border").transition().duration(500).style("stroke-width", ".75px")

			    features.selectAll(".districtLabel").style("opacity", 0);
			features.selectAll(".stateLabel").transition().duration(500).style("opacity", 1);
			features.selectAll(".stateLabel").style("font-size", 11);

		    });

		function zoomed() {
		    tooltip.style("display", "none");
      
		    var t = d3.event.translate,
			s = d3.event.scale,
			ox = widthMap / 2 - 50,
			oy = widthMap / 2;

		    t[0] = Math.min((widthMap / 2 - ox - 100) * (s - 1), Math.max((widthMap / 2 + ox) * (1 - s), t[0]));
		    t[1] = Math.min((heightMap / 2 - oy + 175) * (s - 1), Math.max((heightMap / 2 + oy - 200)  * (1 - s), t[1]));
		    zoom.translate(t);

		    features.attr("transform", "translate(" + t + ")scale(" + s + ")");
		    features.select(".state-border").style("stroke-width", 1.75 / s + "px");
		    features.select(".district-border").style("stroke-width", .75 / s + "px");
		    features.selectAll(".stateLabel").style("opacity", 1.75 - s);
		    features.selectAll(".districtLabel").style("opacity", -2 + s);
		};

		// function zoomed() {
		//     tooltip.style("display", "none");
		//     features.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		//     features.select(".state-border").style("stroke-width", 1.75 / d3.event.scale + "px");
		//     features.select(".district-border").style("stroke-width", .75 / d3.event.scale + "px");
		//     features.selectAll(".stateLabel").style("opacity", 1.75 - d3.event.scale);
		//     features.selectAll(".districtLabel").style("opacity", -2 + d3.event.scale);
		// };

		function updateMap(party) {
		    polygons.transition().duration(500)
			.attr("fill", function(d) {
				switch(party) {
				case "all" : return colorAll(rateById[d.id]);
				case "gop" : if (partyById[d.id] == "R") { return colorGop(rateById[d.id]); } else { return "#fafafa"; };
				case "dem" : if (partyById[d.id] == "D") { return colorDem(rateById[d.id]); } else { return "#fafafa"; };
				}
			    })
			};

		// Toggle button actions
		$(document).ready(function() {
			$('ul.roupToggle li a').click(function() {
				var $this = $(this);
				$('ul.btnGroupToggle li').removeClass('active');
				$this.closest('li').addClass('active');
				if ($this.hasClass("all")) { filter = "district"; updateBars("total"); updateMap("all"); }
				else if ($this.hasClass("gop")) { filter = "R"; updateBars("rDistricts"); updateMap("gop"); }
				else if ($this.hasClass("dem")) { filter = "D"; updateBars("dDistricts"); updateMap("dem"); }
			    });
		    });
};

