var hasFilter=0;

function resort(sortB)
{
	sortBy = sortB;
	writeBioTable();	
}

function writeColumnHeader(text, glyph)
{
	var baseHTML = "<strong>"+text+"</strong> ";
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
		if(sortBy=="name" || sortBy==undefined) { rC.sort(function(a,b) { return a.bioname > b.bioname ? 1 : -1; }); }
		else if(sortBy=="party") { rC.sort(function(a,b) { return (a.party_noun==b.party_noun)?(a.bioname>b.bioname?1:-1):(a.party_noun>b.party_noun?1:-1); }); }
		else if(sortBy=="state") { rC.sort(function(a,b) { return(a.state==b.state)?(a.bioname>b.bioname?1:-1):(a.state>b.state?1:-1); }); }
		else if(sortBy=="elected") { rC.sort(function(a,b) { return (a.minElected==b.minElected)?(a.bioname>b.bioname?1:-1):(a.minElected>b.minElected?1:-1); }); }
		else if(sortBy=="elected_senate") { rC.sort(function(a,b) { return (a.elected_senate==b.elected_senate)?(a.bioname>b.bioname?1:-1):(a.elected_senate>b.elected_senate?1:-1); }); }
		else if(sortBy=="elected_house") { rC.sort(function(a,b) { return (a.elected_house==b.elected_house)?(a.bioname>b.bioname?1:-1):(a.elected_house>b.elected_house?1:-1); }); }
		else if(sortBy=="nominate") { rC.sort(function(a,b) { return a.nominate.dim1 > b.nominate.dim1 ? 1 : -1; }); }
	
		console.log(sortBy);
		if(sortBy=="nominate") { writeColumnHeader("Most Liberal","arrow-down"); }
		else if(sortBy=="elected" || sortBy=="elected_senate" || sortBy=="elected_house") { writeColumnHeader("Most Senior","arrow-down"); }
	
		$.each(rC,function(k, v)
		{
			constructPlot(v);
		});
	
		if(sortBy=="nominate") { writeColumnHeader("Most Conservative","arrow-up"); }
		else if(sortBy=="elected" || sortBy=="elected_senate" || sortBy=="elected_house") { writeColumnHeader("Most Junior","arrow-up"); }
	
		$('#memberList').fadeIn(200);
		if(hasFilter)
		{
			console.log('ok hide them');
			hideMembersUnselected();
		}
	});
}

function constructPlot(member)
{
	// bioname cleanup:
	if(member["bioname"]==undefined)
	{
		console.log("Error. No bio name for this member:");
		console.log(member);
		return;
	}
	if(member["bioname"].length>20 && member["bioname"].indexOf("(")!=-1 && member["bioname"].indexOf(")")!=-1)
	{
		try
		{
			memberNameNew = member["bioname"].split(", ");
			parenthetical = member["bioname"].split("(")[1].split(")")[0];
			memberNameFinal = memberNameNew[0]+", "+parenthetical;
		}
		catch(err)
		{
			console.log(member["bioname"]);
		}		
	}
	else
	{
		memberNameFinal = member["bioname"];
	}

	var memberBox = $("<li></li>")  .addClass("memberResultBox")
					.attr("id",member["icpsr"]).click(function(){window.location='/person/'+member["icpsr"];})
					.css("break-inside","avoid-column")
					.css("overflow","hidden").css("padding-right","5px");
	var linkBox = $("<a></a>").attr("href","/person/"+member["icpsr"]).attr("class","nohover").css("display", "block;");
	var imgBox = $("<img />").css("width","80px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/bios/"+member["bioImgURL"]);
	var bioText = $("<span></span>").css("font-size","0.9em").css("padding-right","0px")
					.html("<strong>"+memberNameFinal+"</strong><br/>"+member["party_noun"]+"<br/><!--<img src=\"/static/img/states/"+member["state_abbrev"]+".png\" style=\"width:20px;\"> -->"+member["state"]+"<br/>Elected "+member["minElected"]);
	imgBox.appendTo(linkBox);
	bioText.appendTo(linkBox);
	linkBox.appendTo(memberBox);
	memberBox.appendTo($("#memberList"));
}
