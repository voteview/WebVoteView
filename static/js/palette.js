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
