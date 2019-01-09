var hasFilter=0;

function resort(sortB, format_text=["name", "party", "state", "elected"])
{
	sortBy = sortB;
	writeBioTable(format_text);
}

function writeColumnHeader(text, glyph)
{
	var baseHTML = "<strong>"+text+"</strong> ";
	if(glyph)
	{
		baseHTML += '<span class="glyphicon glyphicon-'+glyph+'" aria-hidden="true"></span>';
	}
	var memberBox = $("<li></li>").addClass("memberBox").html(baseHTML);
	memberBox.appendTo($("#memberList"));
}

function writeTextTable()
{
	rC = resultCache["results"];
	$("#memberTextList").fadeOut(200, function()
	{
		$("#memberTextList").html("");
		rC.sort(function(a,b) { return a.nominate==undefined ? 1 : b.nominate==undefined ? -1 : a.nominate.dim1==undefined ? 1 : b.nominate.dim1==undefined ? -1 : a.nominate.dim1 > b.nominate.dim1 ? 1 : -1; });
		var member_table = $("<table></table>").attr("id", "memberTextTable").attr("class", "tablesorter");
		$('<thead><tr><th class="sorter-false" width="5%"></th><th width="45%"><strong>Name</strong></th><th width="15%"><strong>Party</strong></th><th width="15%"><strong>State</strong></th><th width="20%"><strong>NOMINATE</strong></th></tr></thead>').appendTo(member_table);
		var i = 1;
		$.each(rC, function(k, v)
		{
			var num_td = $("<td></td>").html(i + ". ").attr("class", "id_display");
			var bio_link = $("<a></a>").html(v["bioname"]).attr("href", "/person/" + v["icpsr"] + "/" + v["seo_name"]);
			var bio_name = $("<td></td>");
			bio_link.appendTo(bio_name);	
			var party_label = $("<td></td>").html(v["party_noun"]);
			if(v["nominate"] != undefined && v["nominate"]["dim1"] != undefined)
			{
				var nominate = $("<td></td>").html(v["nominate"]["dim1"]);
			}
			else
			{
				var nominate = $("<td></td>").html("--");
			}
			var state = $("<td></td>").html(v["state"]);
			var row = $("<tr></tr>");
			num_td.appendTo(row);
			bio_name.appendTo(row);
			party_label.appendTo(row);
			state.appendTo(row);
			nominate.appendTo(row);
			row.appendTo(member_table);
			i = i + 1;
		});
		member_table.appendTo($("#memberTextList"));
		member_table.tablesorter();
		member_table.bind("sortBegin", function(e, table) { $(".id_display").html(""); });
		member_table.bind("sortEnd", function(e, table) 
		{ 
			var i = 1;
			$(".id_display").each(function(k, v) { $(v).html(i + "."); i = i + 1; });
		});
		
		$("#memberTextList").fadeIn(200);
	});
}

function writeBioTable(format_text=["name", "party", "state", "elected"])
{
	rC = resultCache["results"];
	$("#memberList").fadeOut(200,function()
	{
		if(!rC.length) { return; }

		if(sortBy==undefined) { console.log("Default to sorting by name."); sortBy="name"; }
		$("#memberList").html("");
		if(sortBy=="name" || sortBy==undefined) { rC.sort(function(a,b) { return a.bioname > b.bioname ? 1 : -1; }); }
		else if(sortBy=="party") { rC.sort(function(a,b) { return (a.party_noun==b.party_noun)?(a.bioname>b.bioname?1:-1):(a.party_noun>b.party_noun?1:-1); }); }
		else if(sortBy=="state") { rC.sort(function(a,b) { return(a.state==b.state)?(a.bioname>b.bioname?1:-1):(a.state>b.state?1:-1); }); }
		else if(sortBy=="elected") { 
			rC.sort(function(a,b) 
			{ 
				return a.minElected == undefined ? 1 : b.minElected == undefined ? -1 : (a.minElected == b.minElected) ? (a.bioname > b.bioname ? 1 : -1) : (a.minElected > b.minElected ? 1 : -1);
			});
		}
		else if(sortBy=="elected_senate") { 
			rC.sort(function(a,b) 
			{ 
				return a.elected_senate == undefined ? 1 : b.elected_senate == undefined ? -1 : (a.elected_senate == b.elected_senate) ? (a.bioname > b.bioname ? 1 : -1) : (a.elected_senate > b.elected_senate ? 1 : -1);
			});
		}
		else if(sortBy=="elected_house") { 
			rC.sort(function(a,b) 
			{ 
				return a.elected_house == undefined ? 1 : b.elected_house == undefined ? -1 : (a.elected_house == b.elected_house) ? (a.bioname > b.bioname ? 1 : -1) : (a.elected_house > b.elected_house ? 1 : -1); 
			});
		}
		else if(sortBy=="nominate") 
		{ 
			rC.sort(function(a,b) 
			{
				return a.nominate==undefined ? 1 : b.nominate==undefined ? -1 : a.nominate.dim1 > b.nominate.dim1 ? 1 : -1; 
			}); 
		}
	
		if(sortBy=="nominate") { writeColumnHeader("Most Liberal","arrow-down"); }
		else if(sortBy=="elected" || sortBy=="elected_senate" || sortBy=="elected_house") { writeColumnHeader("Most Senior","arrow-down"); }
	
		var errorCount=0;
		$.each(rC,function(k, v)
		{
			if(sortBy=="nominate" && v.nominate==undefined) { errorCount=errorCount+1; }
			else { constructPlot(v, 0, format_text); }
		});
	
		if(sortBy=="nominate") { writeColumnHeader("Most Conservative","arrow-up"); }
		else if(sortBy=="elected" || sortBy=="elected_senate" || sortBy=="elected_house") { writeColumnHeader("Most Junior","arrow-up"); }
		if(errorCount>1) { writeColumnHeader(errorCount+" members have no ideology score."); }
		else if(errorCount) { writeColumnHeader(errorCount+" member has no ideology score."); }

		$('#memberList').fadeIn(200);
		if(hasFilter)
		{
			hideMembersUnselected();
		}
	});
}

function constructPlot(member, margins, format_data=["name", "party", "state", "elected"])
{
	var imageClass = (margins == undefined) ? "memberPad10" : "memberPad5";
	var nameClass = (margins == undefined) ? "namePad5" : "namePad0";

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

	var memberBox = $("<li></li>")  .addClass("memberResultBox").addClass("columnResultBox").addClass(nameClass)
					.attr("id",member["icpsr"]).click(function(){window.location='/person/'+member["icpsr"]+"/"+member["seo_name"];});
	var linkBox = $("<a></a>").attr("href","/person/"+member["icpsr"]+"/"+member["seo_name"]).attr("class","nohover");
	var imgBox = $("<img />").addClass("pull-left").addClass("bio").addClass(imageClass)
				.attr("src","/static/img/bios/"+member["bioImgURL"]);

	var bioTextInner = "";
	if(format_data.includes("name")) { bioTextInner += "<strong>" + memberNameFinal + "</strong><br/>"; }
	if(format_data.includes("party")) { bioTextInner += member["party_noun"] + "<br/>"; }
	if(format_data.includes("state")) { bioTextInner += member["state"] + "<br/>"; }
	if(format_data.includes("chamber")) { bioTextInner += ((member["chamber"].toLowerCase()=="senate") ? "Senator" : "Representative") + "<br/>"; }
	if(format_data.includes("elected") && member["minElected"]!=undefined)
	{
		if(chamber_param=="senate" && member["elected_senate"]!=undefined) { bioTextInner += "Elected "+(1787+(2*member["elected_senate"])); }
		else if(chamber_param=="house" && member["elected_house"]!=undefined) { bioTextInner += "Elected "+(1787+(2*member["elected_house"])); }
		else bioTextInner += "Elected "+member["minElected"];
	}	
	else if(format_data.includes("elected") && member["congresses"]!=undefined)
	{
		bioTextInner += "Elected "+(1787+(member["congresses"][0][0]*2));
	}

	var bioText = $("<span></span>").html(bioTextInner);

	imgBox.appendTo(linkBox);
	bioText.appendTo(linkBox);
	linkBox.appendTo(memberBox);
	memberBox.appendTo($("#memberList"));
}
