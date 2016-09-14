function resort(sortB)
{
	sortBy = sortB;
	writeBioTable();	
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

	var memberBox = $("<div></div>").addClass("col-md-3").addClass("memberResultBox").attr("id",member["icpsr"]).click(function(){window.location='/person/'+member["icpsr"];})
					.css("overflow","hidden").css("padding-right","5px");
	var imgBox = $("<img />").css("width","80px").css("height","80px").css("padding-right","20px").attr("class","pull-left")
					.attr("src","/static/img/bios/"+member["bioImgURL"]);
	var bioText = $("<span></span>").css("font-size","0.9em").css("padding-right","0px")
					.html("<strong>"+memberNameFinal+"</strong><br/>"+member["partyname"]+"<br/><!--<img src=\"/static/img/states/"+member["stateAbbr"]+".png\" style=\"width:20px;\"> -->"+member["stateName"]+"<br/>Elected "+member["minElected"]);
	imgBox.appendTo(memberBox);
	bioText.appendTo(memberBox);
	memberBox.appendTo($("#memberList"));
}
