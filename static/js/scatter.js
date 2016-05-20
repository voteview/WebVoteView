/*jslint white: true */
function WebVoteScatter(element, data, options) {

  // Configurable variables
  var defaults_map = {
    width: 650,
    zoomLevel: 5,
    bubbleRadius: 5,  // Radius of the small bubbles that represent members
    staticUrl: "http://localhost:8000/static/img/bios/" // URL where the static content is stored(images...)
  };

  // Compose Settings Object
  var settings = $.extend(defaults_map, options);

  // Calculate circle attrs
  var margin = 50;
  var radius = (settings.width - 2 * margin) / 2;
  var centered;
  var marginCircle = 25; // Distance of the main circle to the axis
  var circleCenter = { "x": (settings.width + margin) / 2, "y": (settings.width - margin) / 2 };

  var tooltip = d3.select("body").append("div").attr("class", "wvv-tooltip");

  // Data
  var membersByID = {};
  var voteChoices = {
    "1": "Yea", "2": "Yea", "3": "Yea", 
    "4": "Nay", "5": "Nay", "6": "Nay", 
    "7": "Abs", "8": "Abs", "9": "Abs"
  };

  // Initialise the chart
  chart(element, data, options);

  // Create an array with all the members indexed by id
  function setMembers(members, votation) {
    members.forEach(function (d, i) {
        if (d.id in votation.votes) {
           d.vote = votation.votes[d.id];
           membersByID[d.id] = d;
        }
     });
  }

  // Render the tooltip
  function tooltipHTML(members) {
    var tooltipContent = "";
    var index;
    for (index in members) {
      tooltipContent += sprintf("<img src=\"%simg/img%06ds.png\" onerror=\"null;this.src='/vv/static/img/no_image.png';\"/><p><strong>%s</strong></p><p>%s %s</p><p>Vote:%s</p>", settings.staticUrl, parseInt(members[index].icpsr, 10), members[index].fname, members[index].partyname, members[index].cqlabel, members[index].vote);
    }
    return tooltipContent;
  }


  // Main function to draw the scatter plot
  function chart(element, data, options) {

    var svgscatter = d3.select(element)
      .attr("xmlns", "http://www.w3.org/2000/svg")
      .attr("width", settings.width)
      .attr("height", settings.width);

    svgscatter
      .append("clipPath")
        .attr("id", "scatterclip")
        .attr("x", 0)
        .attr("y", 0)
      .append("circle")
        .attr("r", radius)
        .attr("cx", circleCenter.x)
        .attr("cy", circleCenter.y);

     var gg = svgscatter.append("g").attr("id","scatter-group");

     var vn = data.votation['nominate'];

     setMembers(data.members, data.votation);

     var scatterdata = [];
     var scale = 0.0;
     for (k in data.votation.votes) {
        var dt = membersByID[k];
        dt.vote = voteChoices[ data.votation.votes[dt.id]];
        dt.namecqlabel = sprintf("%s %s", dt.fname, dt.cqlabel);
        if (dt.nominate.oneDimNominate != null) {
           var distance = Math.sqrt( Math.pow(dt.nominate.oneDimNominate, 2) + 
                                 Math.pow(dt.nominate.twoDimNominate, 2));
           scale = scale > distance ? scale : distance;
        }
        scatterdata.push(dt);
     } 
     scale = scale < 1 ? 1.01 : scale;

     d3.select("clipPath#scatterclip")
        .append("circle")
        .attr("cx", circleCenter.x)
        .attr("cy", circleCenter.y)
        .attr("r", radius);
       
     gg
        .append("circle")
        .attr("cx", circleCenter.x)
        .attr("cy", circleCenter.y)
        .attr("r", radius)
        .attr("id","outer-circle");

       // Hacky way to shade region where yea vote is expected...
       var angle = -vn.zml[1]/vn.zml[0];
       var cs = (angle>0?1:0) + 2*(vn.zml[0]>0?1:0);
       switch( cs ) {
         case 0:
            var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                               circleCenter.y-radius*vn.y[0]/scale ],
                             [ circleCenter.x+radius*(vn.x[0])/scale,
                               circleCenter.y-radius*(vn.y[0]+10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]+10)/scale,  
                               circleCenter.y-radius*(vn.y[1]+10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]+10)/scale,
                               circleCenter.y-radius*(vn.y[1])/scale ], 
                             [ circleCenter.x+radius*vn.x[1]/scale,
                               circleCenter.y-radius*vn.y[1]/scale ] ]; 
            break;
         case 1:
            var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                               circleCenter.y-radius*vn.y[0]/scale ],
                             [ circleCenter.x+radius*(vn.x[0])/scale,
                               circleCenter.y-radius*(vn.y[1]-10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                               circleCenter.y-radius*(vn.y[1]-10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                               circleCenter.y-radius*(vn.y[1])/scale ], 
                             [ circleCenter.x+radius*vn.x[1]/scale,
                               circleCenter.y-radius*vn.y[1]/scale ] ]; 
            break;
         case 2:
            var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                               circleCenter.y-radius*(vn.y[0])/scale ],
                             [ circleCenter.x+radius*(vn.x[0])/scale,
                               circleCenter.y-radius*(vn.y[0]-10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                               circleCenter.y-radius*(vn.y[0]-10)/scale ],
                             [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                               circleCenter.y-radius*(vn.y[1])/scale ],
                             [ circleCenter.x+radius*vn.x[1]/scale,
                               circleCenter.y-radius*vn.y[1]/scale ] ]; 
            break;
    
         case 3:
            var polyData = [ [ circleCenter.x+radius*vn.x[0]/scale,
                               circleCenter.y-radius*vn.y[0]/scale ],
                             [ circleCenter.x+radius*(vn.x[0])/scale,
                               circleCenter.y-radius*(vn.y[0]+10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                               circleCenter.y-radius*(vn.y[1]-10)/scale ], 
                             [ circleCenter.x+radius*(vn.x[1]-10)/scale,
                               circleCenter.y-radius*(vn.y[1])/scale ], 
                             [ circleCenter.x+radius*vn.x[1]/scale,
                               circleCenter.y-radius*vn.y[1]/scale ] ]; 
            break;
       }
       if (isNaN(angle)) { polyData = [[0,0 ], [0, settings.width],[settings.width, settings.width],[settings.width, 0]] };

     gg.selectAll("polygon")
        .data([polyData])
        .enter()
         .append("polygon")
           .attr("points",function(d) {
                 return d.map( function(d) {
                     return [d[0], d[1]].join(",");
                 }).join(" ");
            })
         .attr("id","yea-semi")
         .attr("style","stroke:none;fill:#FFFFED;clip-path:url(#scatterclip)")
         ;

     gg
        .append("circle")
        .attr("cx", circleCenter.x)
        .attr("cy", circleCenter.y)
        .attr("r", radius/scale)
        .attr("id", "dashed-circle");

     gg
       .append("line")
       .attr("x1", radius/scale*vn.x[0] + circleCenter.x)
       .attr("x2", radius/scale*vn.x[1] + circleCenter.x)
       .attr("y1", circleCenter.y - radius/scale*vn.y[0])
       .attr("y2", circleCenter.y - radius/scale*vn.y[1])
       .attr("id","cutline")
       .attr("style","stroke:#000;stroke-width:2; clip-path:url(#scatterclip)")
       ;

     // Add yea and nay locations to the plot
     if (vn.dl[0] * vn.dl[0] != 0) { // Only drawn if there is a cutline!
       var ynpts =  [circleCenter.x + radius/scale*(vn.dl[0]+vn.zml[0]/2),
                     circleCenter.y - radius/scale*(vn.dl[1]+vn.zml[1]/2),
                     circleCenter.x + radius/scale*(vn.dl[0]-vn.zml[0]/2),
                     circleCenter.y - radius/scale*(vn.dl[1]-vn.zml[1]/2)];
       var angle =   57.295*Math.atan((vn.zml[1])/(vn.zml[0]));
       var cs = (angle>0?1:0) + 2*(vn.zml[0]>0?1:0);
       switch( cs ) {
         case 0:
           angle = 90-angle;
           break;
         case 1:
           angle = 90-angle;
           break;
         case 2:
           angle = 270 - angle;
           break;
         case 3:
           angle = -90 - angle;
           break;
       }
      
       gg.append('polyline')
        .attr("class", "yeanay-line")
        .attr("points", ynpts.join(" "));

       gg.append('text').text('Y')
        .attr("class","yeanay")
        .attr("x", ynpts[2])
        .attr("y", ynpts[3])
        .attr("transform",sprintf("rotate(%d %d %d)", angle, ynpts[2], ynpts[3]));

       gg.append('text').text('N')
        .attr("class","yeanay")
        .attr("x", ynpts[0])
        .attr("y", ynpts[1])
        .attr("transform",sprintf("rotate(%d %d %d)", 180+angle, ynpts[0], ynpts[1]));

       // Fit box (only if cutline is displayed)
       gg.append('text').text(sprintf("PRE: %4.2f", vn.pre))
         .attr("class", "fitbox")
         .attr("x", settings.width - 100)
         .attr("y", settings.width - 70);
   
       gg.append('text').text(sprintf("Classified: %4.2f",vn['classified']))
         .attr("class", "fitbox")
         .attr("x", settings.width - 100)
         .attr("y", settings.width - 90);
     }
     
     // Main scatter plot
     gg.selectAll(".scatter")
     .data(scatterdata)
     .enter()
     .append("circle")
        .attr("id",dt['id'])
        .attr("cx", function(d) {
          return circleCenter.x + d.nominate.oneDimNominate * radius/scale })
        .attr("cy", function(d) {
          return circleCenter.y - d.nominate.twoDimNominate * radius/scale })
        .attr("r", settings.bubbleRadius)
        .attr('class',function(d,i) {
          return d.vote + ' ' + d.partyname; 
         })
        .on("click", clicked) // zoom
        .on("mousemove", function(d) {
          tooltip
            .classed("hidden", false)
            .style("left", d3.event.pageX + 10 + "px")
            .style("top", d3.event.pageY + 5 + "px")
            .html(tooltipHTML([d]));
        })
        .on("mouseout",  function() {
            tooltip.classed("hidden", true)
         });

      var tickLength = 60;
      // X-axis
      gg.append('polyline')
        .attr("class", "scatter-axis")
        .attr("points", sprintf("%d,%d %d,%d %d,%d %d,%d", 
                                margin+15, settings.width-margin, 
                                margin+15, settings.width-tickLength, 
                                settings.width-15, settings.width-tickLength, 
                                settings.width-15, settings.width-margin));

      gg.append('text').text("Liberal")
        .attr("x", settings.width/4)
        .attr("y", settings.width-margin+10)
        .attr("style","text-anchor:middle")
      gg.append('text').text("Conservative")
        .attr("x", 3*settings.width/4)
        .attr("y", settings.width-margin+10)
        .attr("style","text-anchor:middle")
      gg.append('text').text("DWNom 1: Economic/Redistribution")      
        .attr("x", settings.width/2)
        .attr("y", settings.width - 20)
        .attr("style","text-anchor:middle")

      // Y-axis
      gg.append('polyline')
        .attr("class","scatter-axis")
        .attr("points", sprintf("%d,%d  %d,%d  %d,%d  %d,%d", 
                                margin, margin, 
                                tickLength, margin, 
                                tickLength, settings.width-margin-15, 
                                margin, settings.width-margin-15));

      gg.append('text').text("Liberal")
        .attr("x", 40)
        .attr("y", 3*settings.width/4)
        .attr("style","text-anchor:middle")
        .attr("transform", sprintf("rotate(-90 40 %d)", 3*settings.width/4));
      gg.append('text').text("Conservative")
        .attr("x", 40)
        .attr("y", settings.width/4)
        .attr("style","text-anchor:middle")
        .attr("transform", sprintf("rotate(-90 40 %d)", settings.width/4));
      gg.append('text').text("DWNom 2: Social/Race")
        .attr("x",20)
        .attr("y", settings.width/2)
        .attr("style","text-anchor:middle")
        .attr("transform", sprintf("rotate(-90 20 %d)", settings.width/2));

    var buttonUnzoom = svgscatter.append("foreignObject")
        .attr('x', settings.width - 100)
        .attr('y', 20)
        .attr("width", 70)
        .attr("height", 30)
      .append("xhtml:body")
        .style("display", "none")
        .html('<button>Unzoom</button>')
        .on("click", clicked);

    // Zoom on click
    function clicked(d) {
      var x, y, zoomLevel, stroke;

      if (d && centered !== d) {
        x = d3.mouse(this)[0];
        y = d3.mouse(this)[1];
        zoomLevel = settings.zoomLevel;
        centered = d;
        stroke = 0.15;
        buttonUnzoom.style("display", "block");
      } else {
        x = settings.width / 2;
        y = settings.width / 2;
        zoomLevel = 1;
        centered = null;
        stroke = 1;
        buttonUnzoom.style("display", "none");
      }

      gg.classed("active", centered && function(d) { return d === centered; });

      gg.transition()
          .duration(750)
          .attr("transform", "translate(" + settings.width / 2 + "," + settings.width / 2 + ")scale(" + zoomLevel + ")translate(" + -x + "," + -y + ")")
          .style("stroke-width", stroke + "px");
    }

  } 
}
