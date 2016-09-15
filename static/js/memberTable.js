function resort(sortB)
{
	sortBy = sortB;
	writeBioTable();	
}

function writeColumnHeader(text, glyph)
{
	var baseHTML = "<strong><u>"+text+"</u></strong> ";
	if(glyph)
	{
		baseHTML += '<span class="glyphicon glyphicon-'+glyph+'" aria-hidden="true"></span>';
	}
	var memberBox = $("<li></li>").css("overflow","hidden")
		.css("break-inside","avoid-column")
		.css("margin-top","10px").css("margin-bottom","10px")
		.css("text-align","center").html(baseHTML);
	memberBox.appendTo($("#memberList"));
}

function writeBioTable()
{
	rC = resultCache["results"];
	$("#memberList").fadeOut(200,function()
	{
		$("#memberList").html("");
		if(sortBy=="name" || sortBy==undefined) { rC.sort(function(a,b) { return a.bioName > b.bioName ? 1 : -1; }); }
		else if(sortBy=="party") { rC.sort(function(a,b) { return (a.partyname==b.partyname)?(a.bioName>b.bioName?1:-1):(a.partyname>b.partyname?1:-1); }); }
		else if(sortBy=="state") { rC.sort(function(a,b) { return(a.stateName==b.stateName)?(a.bioName>b.bioName?1:-1):(a.stateName>b.stateName?1:-1); }); }
		else if(sortBy=="elected") { rC.sort(function(a,b) { return (a.minElected==b.minElected)?(a.bioName>b.bioName?1:-1):(a.minElected>b.minElected?1:-1); }); }
		else if(sortBy=="nominate") { rC.sort(function(a,b) { return a.nominate.oneDimNominate > b.nominate.oneDimNominate ? 1 : -1; }); }
	
		if(sortBy=="nominate") { writeColumnHeader("Most Liberal","arrow-down"); }
		else if(sortBy=="elected") { writeColumnHeader("Most Senior","arrow-down"); }
	
		$.each(rC,function(k, v)
		{
			constructPlot(v);
		});
	
		if(sortBy=="nominate") { writeColumnHeader("Most Conservative","arrow-up"); }
		else if(sortBy=="elected") { writeColumnHeader("Most Junior","arrow-up"); }
	
		$('#memberList').fadeIn(200);
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

	var memberBox = $("<li></li>")  .addClass("memberResultBox")
					.attr("id",member["icpsr"]).click(function(){window.location='/person/'+member["icpsr"];})
					.css("break-inside","avoid-column")
					.css("overflow","hidden").css("padding-right","5px");
	var imgBox = $("<img />").css("width","80px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/bios/"+member["bioImgURL"]);
	var bioText = $("<span></span>").css("font-size","0.9em").css("padding-right","0px")
					.html("<strong>"+memberNameFinal+"</strong><br/>"+member["partyname"]+"<br/><!--<img src=\"/static/img/states/"+member["stateAbbr"]+".png\" style=\"width:20px;\"> -->"+member["stateName"]+"<br/>Elected "+member["minElected"]);
	imgBox.appendTo(memberBox);
	bioText.appendTo(memberBox);
	memberBox.appendTo($("#memberList"));
}
