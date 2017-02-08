import unidecode
import re

# Linearize name
def linearName(text):
	if "," in text:
		chunks = text.split(", ")
		if len(chunks)>=3:
			newText = chunks[1]+" "+chunks[0]+", "+" ".join(chunks[2:])
		else:
			newText = chunks[1]+" "+chunks[0]
		return newText.strip()
	else:
		return text


# Change text strings to SEO-friendly link strings.
def slugify(text):
	text = unidecode.unidecode(text).lower()	
	text = linearName(text)
	text = re.sub(r"[^a-z0-9]+","-",text).strip()
	text = re.sub(r"[-]+","-",text)
	text = re.sub(r"[-]$","",text)
	return text
