var partyMapping = {
	"Liberal": "Democrat",
	"Ind. Democrat": "Democrat",
	"Law and Order": "Whig",
	"Ind. Whig": "Whig",
	"Ind. Republican": "Republican",
	"American Labor": "Independent",
	"Crawford Republican": "Republican",
	"Adams-Clay Republican": "Republican",
	"Jackson Republican": "Republican",
	"Adams-Clay Federalist": "Federalist",
	"Jackson Federalist": "Federalist",
	"Crawford Federalist": "Federalist",
	"Liberty": "Independent",
	"Anti-Lecompton Democrat": "Democrat",
	"Union": "Unionist",
	"Constitutional Unionist": "Unionist",
	"Unconditional Unionist": "Unionist",
	"Conservative Republican": "Republican",
	"Liberal Republican": "Republican",
	"Silver Republican": "Republican",
	"Silver": "Democrat"
}
if(congressNum==24) { partyMapping["States Rights"] = "Nullifier"; }
if(congressNum==34) { partyMapping["Republican"] = "Oppsition"; }

function partyNameSimplify(partyName)
{
	if(mapParties)
	{
		if(partyMapping[partyName] != undefined) 
		{ 
			$("#warnParty").show();
			return partyMapping[partyName]; 
		}
		else { return partyName; }
	} 
	else
	{
		return partyName;
	}
}

// ColorBrewer Diverging Colors. Yea: 5-class, most intense; Nay: 5-class, second intensity. Abs: 7-class 3rd intensity, blended with #f7f7f7
// Yellow: From YellowOrangeRed. Yea: 5-class 2nd yellow; Nay: 5-class 1st yellow; Abs: 7-class 1st yellow, blended with #f7f7f7
var colorSchemes = {
	"red": ["#ca0020", "#f4a582", "#fae9df"],
	"blue": ["#0571b0", "#92c5de", "#e4eef4"],
	"green": ["#008837", "#a6dba0", "#e8f4e5"],
	"orange": ["#e66101", "#fdb863", "#fbecd7"],
	"grey": ["#404040", "#bababa", "#ececec"],
	"pinkpurple": ["#d01c8b", "#f1b6da", "#faecf3"],
	"brown": ["#a6611a", "#dfc27d", "#f7f0dd"],
	"teal": ["#018571", "#b0cdc1", "#dff1ee"],
	"yellow": ["#fecc5c", "#ffffb2", "#fbfbd5"],
} 

var partyColorMap = {
	"Democrat": "blue",
	"Republican": "red",
	"Independent": "grey",
	"Pro-Administration": "blue",
	"Anti-Administration": "red",
	"Federalist": "red",
	"Farmer-Labor": "blue",
	"Progressive": "blue",
	"Adams": "yellow",
	"Jackson": "teal",
	"Anti-Jackson": "yellow",
	"Nullifier": "green",
	"American": "green",
	"Unionist": "pinkpurple",
	"Populist": "brown",
	"Whig": "pinkpurple",
	"Socialist": "pinkpurple",
	"Farmer-Labor": "green",
	"Anti Masonic": "orange"
}
if(congressNum<20) { partyColorMap["Republican"] = "blue"; }

function genPartyColors()
{
	var partyColors = {}
	for(var key in partyColorMap)
	{
		if(colorSchemes[partyColorMap[key]] != undefined)
		{
			partyColors["Yea"+key] = colorSchemes[partyColorMap[key]][0];
			partyColors["Nay"+key] = colorSchemes[partyColorMap[key]][1];
			partyColors["Abs"+key] = colorSchemes[partyColorMap[key]][2];
		}
		else
		{
			partyColor["Yea"+key] = colorSchemes["grey"][0];
			partyColor["Nay"+key] = colorSchemes["grey"][1];
			partyColor["Abs"+key] = colorSchemes["grey"][2];
		}
	}
	return partyColors;
}

// Blend an array of colors
function blendColors(members)
{
	var r = 0, g = 0 , b = 0, i, rgbColor;
	for (i = 0; i < members.length; i++) 
	{
		rgbColor = d3.rgb(partyColors[members[i].vote + partyNameSimplify(members[i].party)]);
		r = r + rgbColor.r;
		g = g + rgbColor.g;
		b = b + rgbColor.b; 
	}
	r = r / members.length;
	g = g / members.length;
	b = b / members.length;
	return d3.rgb(r,g,b).toString();
}


var partyColors = genPartyColors();
