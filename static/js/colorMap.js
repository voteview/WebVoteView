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
	"orange": ["#e66101", "#fdb863", "#fbecd7"],
	"yellow": ["#fecc5c", "#ffffb2", "#fbfbd5"],
	"green": ["#008837", "#a6dba0", "#e8f4e5"],
	"teal": ["#018571", "#b0cdc1", "#dff1ee"],
	"blue": ["#0571b0", "#92c5de", "#e4eef4"],
	"purple": ["#7b3294", "#c2a5cf", "#EFE6F0"],
	"pinkpurple": ["#d01c8b", "#f1b6da", "#faecf3"],
	"grey": ["#404040", "#bababa", "#ececec"],
	"brown": ["#a6611a", "#dfc27d", "#f7f0dd"],
} 

// ColorBrewer single-hue sequential, 6-class (7th class will always be white and added externally)
var colorSchemesSequential = {
	"red": ["#a50f15", "#de2d26", "#fb6a4a", "#fc9272", "#fcbba1", "#fee5d9"],
	"orange": ["#a63603", "#e6550d", "#fd8d3c", "#fdae6b", "#fdd0a2", "#feedde"],
	"yellow": ["#ffff00", "#ffff2a", "#ffff55", "#ffff7f", "#ffffaa", "#ffffd4"], // Yellow is manual gradient, not one of ColorBrewer's
	"green": ["#006d2c", "#31a354", "#74c476", "#a1d99b", "#c7e9c0", "#edf8e9"],
	"teal": ["#016c59", "#1c9099", "#67a9cf", "#a6bddb", "#d0d1e6", "#f6eff7"],	// Teal is PuBuGn 6-class sequential
	"blue": ["#08519c", "#3182bd", "#6baed6", "#9ecae1", "#c6dbef", "#eff3ff"],
	"purple": ["#54278f", "#756bb1", "#9e9ac8", "#bcbddc", "#dadaeb", "#f2f0f7"],
	"pinkpurple": ["#980043", "#dd1c77", "#df65b0", "#c994c7", "#d4b9da", "#f1eef6"],
	"grey": ["#252525", "#525252", "#737373", "#969696", "#bdbdbd", "#d9d9d9"],
	"brown": ["#993404", "#d95f0e", "#fe9929", "#fec44f", "#fee391", "#ffffd4"], // brown is YlOrBr 6-class sequential
}

var partyColorMap = {
	"Democrat": "blue",
	"Democrat-Republican": "blue",
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
	"Anti Masonic": "orange",
	"National Greenbacker": "green",
	"Silver": "grey",
	"Silver Republican": "grey",
	"Conservative": "purple",
	"Prohibition": "brown",
	"States Rights": "orange",
	"Readjuster Democrat": "blue",
	"Readjuster": "blue",
	"Progressive Republican": "pinkpurple",
	"Prohibitionist": "grey",
	"Union Labor": "red",
	"Free Soil": "yellow",
	"Opposition": "red"
}

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
		if(members[i].vote != undefined)
		{
			rgbColor = d3.rgb(partyColors[members[i].vote + partyNameSimplify(members[i].party)]);
		}
		else
		{
			rgbColor = d3.rgb(partyColors["Yea"+partyNameSimplify(members[i].partyname)]);
		}
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
