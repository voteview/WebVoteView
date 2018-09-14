import json
from numpy.random import choice

def generate_slides():
        slides = json.load(open("static/carousel/slides.json", "r"))
        weights = [x["weight"] for x in slides]
        sum_weights = sum(weights)
        weights = [w / float(sum_weights) for w in weights]
        num_slides = 5
        slides = choice(slides, 5, replace=False, p=weights)
	return slides
